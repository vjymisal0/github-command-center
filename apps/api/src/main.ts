import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
config({ path: existsSync(join(process.cwd(), '.env')) ? join(process.cwd(), '.env') : join(process.cwd(), '../../.env') });

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { PrismaClient, type PullRequestState, type RepositoryVisibility } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import { classifyActionReasons, decryptCredential, encryptCredential, type PullRequestFacts } from '@gcc/shared';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const prisma = new PrismaClient();
const webUrl = process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000';
const production = process.env.NODE_ENV === 'production';
const listQuery = z.object({ search: z.string().max(200).optional(), state: z.string().optional(), ci: z.string().optional(), visibility: z.string().optional(), relationship: z.string().optional() });
const credentialsBody = z.object({ email: z.string().email(), password: z.string().min(6).max(200) });
const patBody = z.object({ token: z.string().min(20).max(500) });

type AuthUser = { id: string; email: string; name: string | null };

declare module 'fastify' { interface FastifyRequest { authUser: AuthUser | null } }

function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`;
}
function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), 32);
  const expected = Buffer.from(hashHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function sessionCookie(reply: FastifyReply, id: string) {
  reply.setCookie('sid', id, { httpOnly: true, sameSite: 'lax', secure: production, path: '/', maxAge: 60 * 60 * 24 * 30 });
}
function contains(value: string, needle = '') { return value.toLowerCase().includes(needle.toLowerCase()); }
function relationLabel(values: string[]) { return values.includes('OWNED') ? 'Owned' : values.includes('COLLABORATING') ? 'Collaborating' : 'External contribution'; }
function publicUser(user: AuthUser) { return { id: user.id, email: user.email, name: user.name }; }

async function requireEncryptionKey() {
  if (production && !/^[a-f0-9]{64}$/i.test(process.env.CREDENTIAL_ENCRYPTION_KEY ?? '')) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex value in production');
}

async function syncGitHubData(userId: string, connectionId: string, token: string, log: FastifyRequest['log']) {
  const octokit = new Octokit({ auth: token });
  async function fetchRepository(owner: string, repo: string) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try { return (await octokit.rest.repos.get({ owner, repo })).data; }
      catch (error) {
        if (attempt === 3) { log.warn({ error, owner, repo }, 'Skipping repository after GitHub retries'); return null; }
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }
    }
    return null;
  }
  const { data: ghUser } = await octokit.rest.users.getAuthenticated();
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, { per_page: 100, affiliation: 'owner,collaborator,organization_member', sort: 'updated' });
  const seenRepositoryIds: string[] = [];
  const seenPullRequestIds: string[] = [];
  let pullRequests = 0;

  for (const repo of repos) {
    const record = await prisma.repository.upsert({
      where: { githubId: BigInt(repo.id) },
      update: { owner: repo.owner.login, name: repo.full_name, visibility: (repo.private ? 'PRIVATE' : 'PUBLIC') as RepositoryVisibility },
      create: { githubId: BigInt(repo.id), owner: repo.owner.login, name: repo.full_name, visibility: (repo.private ? 'PRIVATE' : 'PUBLIC') as RepositoryVisibility },
    });
    seenRepositoryIds.push(record.id);
    const relationship = repo.owner.login.toLowerCase() === ghUser.login.toLowerCase() ? 'OWNED' : 'COLLABORATING';
    await prisma.userRepositoryAccess.upsert({
      where: { userId_repositoryId_connectionId: { userId, repositoryId: record.id, connectionId } },
      update: { connectionId, relationships: [relationship], status: 'active', lastVerifiedAt: new Date() },
      create: { userId, repositoryId: record.id, connectionId, relationships: [relationship], status: 'active', lastVerifiedAt: new Date() },
    });
  }

  const searches = await Promise.all([
    octokit.paginate(octokit.rest.search.issuesAndPullRequests, { q: `type:pr author:${ghUser.login} state:open`, per_page: 100 }),
    octokit.paginate(octokit.rest.search.issuesAndPullRequests, { q: `type:pr author:${ghUser.login} is:merged`, per_page: 100 }),
    octokit.paginate(octokit.rest.search.issuesAndPullRequests, { q: `type:pr review-requested:${ghUser.login} state:open`, per_page: 100 }),
  ]);
  const authoredOrReviewRequested = new Map(searches.flat().map(item => [item.id, item]));
  const reviewRequestedIds = new Set(searches[2].map(item => item.id));

  for (const item of authoredOrReviewRequested.values()) {
    const [owner, repoName] = item.repository_url.replace('https://api.github.com/repos/', '').split('/');
    let record = await prisma.repository.findUnique({ where: { owner_name: { owner, name: `${owner}/${repoName}` } } });
    if (!record) {
      const repo = await fetchRepository(owner, repoName);
      if (!repo) continue;
      record = await prisma.repository.upsert({
        where: { githubId: BigInt(repo.id) },
        update: { owner, name: repo.full_name, visibility: (repo.private ? 'PRIVATE' : 'PUBLIC') as RepositoryVisibility },
        create: { githubId: BigInt(repo.id), owner, name: repo.full_name, visibility: (repo.private ? 'PRIVATE' : 'PUBLIC') as RepositoryVisibility },
      });
    }
    const alreadyAccessible = seenRepositoryIds.includes(record.id);
    if (!alreadyAccessible) {
      seenRepositoryIds.push(record.id);
      await prisma.userRepositoryAccess.upsert({
        where: { userId_repositoryId_connectionId: { userId, repositoryId: record.id, connectionId } },
        update: { relationships: ['EXTERNAL_CONTRIBUTION'], status: 'active', lastVerifiedAt: new Date() },
        create: { userId, repositoryId: record.id, connectionId, relationships: ['EXTERNAL_CONTRIBUTION'], status: 'active', lastVerifiedAt: new Date() },
      });
    }
    const mergedAt = item.pull_request?.merged_at ?? null;
    const state: PullRequestState = mergedAt ? 'MERGED' : item.state === 'open' ? 'OPEN' : 'CLOSED';
    const draft = Boolean(item.draft);
    const dbPr = await prisma.pullRequest.upsert({
      where: { repositoryId_number: { repositoryId: record.id, number: item.number } },
      update: { title: item.title, authorLogin: item.user?.login ?? 'unknown', state, draft, mergedAt: mergedAt ? new Date(mergedAt) : null, closedAt: item.closed_at ? new Date(item.closed_at) : null, htmlUrl: item.html_url, description: item.body, lastSyncedAt: new Date() },
      create: { repositoryId: record.id, githubNodeId: item.node_id, number: item.number, title: item.title, authorLogin: item.user?.login ?? 'unknown', state, draft, openedAt: new Date(item.created_at), mergedAt: mergedAt ? new Date(mergedAt) : null, closedAt: item.closed_at ? new Date(item.closed_at) : null, htmlUrl: item.html_url, description: item.body },
    });
    seenPullRequestIds.push(dbPr.id);
    const facts: PullRequestFacts = { authorLogin: item.user?.login ?? '', currentUserLogin: ghUser.login, draft, state, reviewRequested: reviewRequestedIds.has(item.id) };
    const activeReasons = classifyActionReasons(facts);
    await prisma.actionItem.updateMany({ where: { userId, pullRequestId: dbPr.id, reason: { notIn: activeReasons }, resolvedAt: null }, data: { resolvedAt: new Date() } });
    for (const reason of activeReasons) await prisma.actionItem.upsert({ where: { userId_pullRequestId_reason: { userId, pullRequestId: dbPr.id, reason } }, update: { lastSeenAt: new Date(), resolvedAt: null }, create: { userId, pullRequestId: dbPr.id, reason, evidence: { source: 'github-sync' } } });
    pullRequests++;
  }

  await prisma.actionItem.updateMany({ where: { userId, resolvedAt: null, pullRequestId: { notIn: seenPullRequestIds } }, data: { resolvedAt: new Date() } });
  await prisma.userRepositoryAccess.updateMany({ where: { userId, connectionId, repositoryId: { notIn: seenRepositoryIds } }, data: { status: 'revoked', lastVerifiedAt: new Date() } });
  await prisma.gitHubConnection.update({ where: { id: connectionId }, data: { githubUserId: BigInt(ghUser.id), username: ghUser.login, status: 'ACTIVE' } });
  log.info({ userId, connectionId, repositories: repos.length, pullRequests }, 'GitHub sync completed');
  return { login: ghUser.login, id: ghUser.id, repositories: repos.length, pullRequests };
}

export async function buildApp(opts: { logger?: boolean } = {}) {
  await requireEncryptionKey();
  const app = Fastify({ logger: opts.logger ?? false });
  await app.register(helmet);
  await app.register(sensible);
  await app.register(formbody);
  await app.register(cookie);
  await app.register(cors, { origin: webUrl, credentials: true, methods: ['GET', 'POST', 'DELETE'], allowedHeaders: ['Content-Type', 'Accept'] });
  app.decorateRequest('authUser', null);

  app.addHook('preHandler', async (request, reply) => {
    const sid = request.cookies.sid;
    if (sid) {
      const session = await prisma.session.findUnique({ where: { id: sid }, include: { user: true } });
      if (session && session.expiresAt > new Date()) request.authUser = session.user;
      else if (session) await prisma.session.delete({ where: { id: sid } });
    }
    const path = request.url.split('?')[0];
    if (path === '/health' || path === '/auth/register' || path === '/auth/login' || path === '/auth/me' || path === '/auth/github' || path === '/auth/github/callback') return;
    if (!request.authUser) return reply.code(401).send({ error: 'Authentication required' });
  });

  app.get('/health', async () => { await prisma.$queryRaw`SELECT 1`; return { ok: true }; });
  app.get('/auth/github', async (_request, reply) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return reply.code(503).send({ error: 'GitHub login is not configured' });
    const state = randomBytes(24).toString('hex');
    reply.setCookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: production, path: '/', maxAge: 600 });
    const callback = process.env.GITHUB_OAUTH_CALLBACK_URL ?? `${webUrl}/api/auth/github/callback`;
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: callback, scope: 'read:user user:email repo', state });
    return reply.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });
  app.get('/auth/github/callback', async (request, reply) => {
    const query = z.object({ code: z.string().min(1), state: z.string().min(1) }).parse(request.query);
    if (!request.cookies.oauth_state || query.state !== request.cookies.oauth_state) return reply.code(400).send({ error: 'Invalid or expired OAuth state' });
    reply.clearCookie('oauth_state', { path: '/' });
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) return reply.code(503).send({ error: 'GitHub login is not configured' });
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: query.code }) });
    const tokenBody = await tokenResponse.json() as { access_token?: string; error_description?: string };
    if (!tokenBody.access_token) return reply.code(401).send({ error: tokenBody.error_description ?? 'GitHub authorization failed' });
    const octokit = new Octokit({ auth: tokenBody.access_token });
    const { data: github } = await octokit.rest.users.getAuthenticated();
    let email = github.email;
    if (!email) {
      const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
      email = emails.find(item => item.primary && item.verified)?.email ?? emails.find(item => item.verified)?.email ?? null;
    }
    if (!email) return reply.code(400).send({ error: 'A verified GitHub email is required' });
    const normalizedEmail = email.toLowerCase();
    let user = await prisma.user.findFirst({ where: { OR: [{ githubUserId: BigInt(github.id) }, { email: normalizedEmail }] } });
    user = user
      ? await prisma.user.update({ where: { id: user.id }, data: { githubUserId: BigInt(github.id), githubLogin: github.login, name: user.name ?? github.name ?? github.login } })
      : await prisma.user.create({ data: { email: normalizedEmail, name: github.name ?? github.login, githubUserId: BigInt(github.id), githubLogin: github.login } });
    const connectionId = `oauth_${user.id}_${github.id}`;
    const encrypted = encryptCredential(tokenBody.access_token);
    await prisma.$transaction(async tx => {
      await tx.gitHubConnection.upsert({ where: { id: connectionId }, update: { status: 'ACTIVE', username: github.login, githubUserId: BigInt(github.id) }, create: { id: connectionId, userId: user.id, type: 'PAT', status: 'ACTIVE', username: github.login, githubUserId: BigInt(github.id), scopes: ['repo', 'read:user', 'user:email'] } });
      await tx.encryptedCredential.upsert({ where: { connectionId }, update: { keyVersion: encrypted.keyVersion, ciphertext: new Uint8Array(encrypted.ciphertext), nonce: new Uint8Array(encrypted.nonce), tag: new Uint8Array(encrypted.tag) }, create: { connectionId, keyVersion: encrypted.keyVersion, ciphertext: new Uint8Array(encrypted.ciphertext), nonce: new Uint8Array(encrypted.nonce), tag: new Uint8Array(encrypted.tag) } });
    });
    const sid = randomUUID();
    await prisma.session.create({ data: { id: sid, userId: user.id, expiresAt: new Date(Date.now() + 30 * 86400000) } });
    sessionCookie(reply, sid);
    void syncGitHubData(user.id, connectionId, tokenBody.access_token, request.log).catch(error => request.log.error({ error, userId: user.id, connectionId }, 'GitHub OAuth sync failed'));
    return reply.redirect(webUrl);
  });
  app.post('/auth/register', async (request, reply) => {
    const body = credentialsBody.parse(request.body);
    const allowRegistration = process.env.ALLOW_REGISTRATION === 'true' || (await prisma.user.count()) === 0;
    if (!allowRegistration) return reply.code(403).send({ error: 'Registration is disabled' });
    const email = body.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) return reply.code(409).send({ error: 'Account already exists' });
    const user = await prisma.user.create({ data: { email, name: email.split('@')[0], passwordHash: hashPassword(body.password) } });
    const sid = randomUUID();
    await prisma.session.create({ data: { id: sid, userId: user.id, expiresAt: new Date(Date.now() + 30 * 86400000) } });
    sessionCookie(reply, sid);
    return reply.code(201).send({ user: publicUser(user) });
  });
  app.post('/auth/login', async (request, reply) => {
    const body = credentialsBody.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !verifyPassword(body.password, user.passwordHash)) return reply.code(401).send({ error: 'Invalid email or password' });
    const sid = randomUUID();
    await prisma.session.create({ data: { id: sid, userId: user.id, expiresAt: new Date(Date.now() + 30 * 86400000) } });
    sessionCookie(reply, sid);
    return { user: publicUser(user) };
  });
  app.post('/auth/logout', async (request, reply) => { if (request.cookies.sid) await prisma.session.deleteMany({ where: { id: request.cookies.sid } }); reply.clearCookie('sid', { path: '/' }); return { ok: true }; });
  app.get('/auth/me', async request => ({ user: request.authUser ? publicUser(request.authUser) : null }));

  app.get('/connections', async request => {
    const connections = await prisma.gitHubConnection.findMany({ where: { userId: request.authUser!.id, status: 'ACTIVE' }, select: { id: true, type: true, username: true } });
    const accounts = connections.map(c => ({ id: c.id, username: c.username ?? 'GitHub user' }));
    return { data: [{ type: 'PAT (Personal Access Token)', status: accounts.length ? `${accounts.length} connected` : 'Not configured', coverage: 'Current active mode', description: 'Read-only GitHub synchronization.', webhook: false, accounts: accounts.map(a => `@${a.username}`), accountItems: accounts }], connectedCount: accounts.length, permissionChecklist: ['Repository metadata (Read)', 'Pull requests (Read)', 'Commit statuses (Read)', 'Checks (Read)'] };
  });
  app.post('/connections/pat/test', async request => { const { token } = patBody.parse(request.body); const { data: user } = await new Octokit({ auth: token }).rest.users.getAuthenticated(); return { ok: true, githubUser: { id: user.id, login: user.login, avatarUrl: user.avatar_url } }; });
  app.post('/connections/pat', async (request, reply) => {
    const userId = request.authUser!.id;
    if (await prisma.gitHubConnection.count({ where: { userId, status: 'ACTIVE' } })) return reply.code(409).send({ error: 'A GitHub account is already connected' });
    const { token } = patBody.parse(request.body);
    const octokit = new Octokit({ auth: token });
    let ghUser;
    try { ghUser = (await octokit.rest.users.getAuthenticated()).data; } catch { return reply.code(401).send({ error: 'GitHub token validation failed' }); }
    const id = `pat_${userId}_${ghUser.id}`;
    const encrypted = encryptCredential(token);
    await prisma.$transaction(async tx => {
      await tx.gitHubConnection.upsert({ where: { id }, update: { status: 'ACTIVE', username: ghUser.login, githubUserId: BigInt(ghUser.id) }, create: { id, userId, type: 'PAT', status: 'ACTIVE', username: ghUser.login, githubUserId: BigInt(ghUser.id), scopes: [] } });
      const ciphertext = new Uint8Array(encrypted.ciphertext);
      const nonce = new Uint8Array(encrypted.nonce);
      const tag = new Uint8Array(encrypted.tag);
      await tx.encryptedCredential.upsert({ where: { connectionId: id }, update: { keyVersion: encrypted.keyVersion, ciphertext, nonce, tag }, create: { connectionId: id, keyVersion: encrypted.keyVersion, ciphertext, nonce, tag } });
    });
    void syncGitHubData(userId, id, token, request.log).catch(error => request.log.error({ error, userId, connectionId: id }, 'GitHub sync failed'));
    return reply.code(202).send({ ok: true, state: 'syncing', user: { login: ghUser.login, id: ghUser.id } });
  });
  app.post('/connections/:id/delete', async request => {
    const { id } = request.params as { id: string }; const userId = request.authUser!.id;
    const connection = await prisma.gitHubConnection.findFirst({ where: { id, userId } });
    if (!connection) return app.httpErrors.notFound('Connection not found');
    await prisma.$transaction([prisma.userRepositoryAccess.updateMany({ where: { userId, connectionId: id }, data: { status: 'revoked' } }), prisma.gitHubConnection.delete({ where: { id } })]);
    return { ok: true };
  });
  app.delete('/connections/:id', async request => { const { id } = request.params as { id: string }; const userId = request.authUser!.id; const c = await prisma.gitHubConnection.findFirst({ where: { id, userId } }); if (!c) return app.httpErrors.notFound('Connection not found'); await prisma.gitHubConnection.delete({ where: { id } }); return { ok: true }; });

  app.post('/sync', async (request, reply) => {
    const userId = request.authUser!.id;
    const connections = await prisma.gitHubConnection.findMany({ where: { userId, status: 'ACTIVE' }, include: { credential: true } });
    let queuedAccounts = 0;
    for (const c of connections) if (c.credential) {
      const token = decryptCredential({ ciphertext: Buffer.from(c.credential.ciphertext), nonce: Buffer.from(c.credential.nonce), tag: Buffer.from(c.credential.tag) });
      void syncGitHubData(userId, c.id, token, request.log).catch(error => request.log.error({ error, userId, connectionId: c.id }, 'GitHub sync failed'));
      queuedAccounts++;
    }
    return reply.code(202).send({ ok: true, state: 'syncing', queuedAccounts });
  });
  app.get('/sync/status', async request => { const count = await prisma.gitHubConnection.count({ where: { userId: request.authUser!.id, status: 'ACTIVE' } }); const last = await prisma.userRepositoryAccess.findFirst({ where: { userId: request.authUser!.id, status: 'active' }, orderBy: { lastVerifiedAt: 'desc' }, select: { lastVerifiedAt: true } }); return { state: count ? 'synced' : 'not_configured', message: count ? `${count} GitHub account(s) active.` : 'Connect GitHub before first sync.', lastSuccessfulSync: last?.lastVerifiedAt?.toISOString() ?? null }; });

  const accessWhere = (userId: string) => ({ userAccess: { some: { userId, status: 'active' } } });
  const connectedUsernames = async (userId: string) => (await prisma.gitHubConnection.findMany({ where: { userId, status: 'ACTIVE', username: { not: null } }, select: { username: true } })).flatMap(connection => connection.username ? [connection.username] : []);
  app.get('/repositories', async request => {
    const userId = request.authUser!.id;
    const q = listQuery.parse(request.query);
    const usernames = await connectedUsernames(userId);
    const records = await prisma.repository.findMany({
      where: { ...accessWhere(userId), ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}), ...(q.visibility ? { visibility: q.visibility.toUpperCase() as RepositoryVisibility } : {}) },
      include: { userAccess: { where: { userId, status: 'active' } }, _count: { select: { pullRequests: { where: { authorLogin: { in: usernames } } } } } },
      orderBy: { updatedAt: 'desc' },
    });
    const data = records.map(r => ({ id: r.id, name: r.name, relationship: relationLabel(r.userAccess[0]?.relationships ?? []), visibility: r.visibility[0] + r.visibility.slice(1).toLowerCase(), prs: r._count.pullRequests, synced: r.userAccess[0]?.lastVerifiedAt?.toISOString() ?? 'pending' })).filter(r => !q.relationship || r.relationship.toLowerCase() === q.relationship.toLowerCase());
    return { total: data.length, data, coverage: data.length ? 'live' : 'not_connected' };
  });
  app.get('/repositories/:id', async request => {
    const userId = request.authUser!.id;
    const { id } = request.params as { id: string };
    const usernames = await connectedUsernames(userId);
    const r = await prisma.repository.findFirst({ where: { id, ...accessWhere(userId) }, include: { userAccess: { where: { userId, status: 'active' } }, _count: { select: { pullRequests: { where: { authorLogin: { in: usernames } } } } } } });
    if (!r) return app.httpErrors.notFound('Repository not found');
    return { id: r.id, name: r.name, relationship: relationLabel(r.userAccess[0].relationships), visibility: r.visibility, prs: r._count.pullRequests, synced: r.userAccess[0].lastVerifiedAt?.toISOString() ?? 'pending' };
  });

  const prShape = (p: any) => ({ id: p.id, repo: p.repository.name, number: p.number, title: p.title, author: p.authorLogin, state: p.draft ? 'Draft' : p.state[0] + p.state.slice(1).toLowerCase(), ci: p.ciStatus, review: p.reviewStatus, reasons: p.actionItems?.map((a: any) => a.reason) ?? [], updated: p.lastSyncedAt.toISOString(), htmlUrl: p.htmlUrl });
  const scopedPrWhere = (userId: string) => ({ repository: accessWhere(userId) });
  app.get('/pull-requests', async request => {
    const userId = request.authUser!.id;
    const q = listQuery.parse(request.query);
    const usernames = await connectedUsernames(userId);
    const records = await prisma.pullRequest.findMany({
      where: {
        AND: [
          scopedPrWhere(userId),
          { OR: [{ authorLogin: { in: usernames } }, { actionItems: { some: { userId, resolvedAt: null } } }] },
          ...(q.search ? [{ OR: [{ title: { contains: q.search, mode: 'insensitive' as const } }, { repository: { name: { contains: q.search, mode: 'insensitive' as const } } }] }] : []),
        ],
        ...(q.state ? { state: q.state.toUpperCase() as PullRequestState } : {}),
        ...(q.ci ? { ciStatus: q.ci.toUpperCase() } : {}),
      },
      include: { repository: true, actionItems: { where: { userId, resolvedAt: null } } },
      orderBy: { lastSyncedAt: 'desc' },
    });
    return { total: records.length, data: records.map(prShape), coverage: records.length ? 'live' : 'not_connected' };
  });
  app.get('/pull-requests/:id', async request => { const { id } = request.params as { id: string }; const p = await prisma.pullRequest.findFirst({ where: { id, ...scopedPrWhere(request.authUser!.id) }, include: { repository: true, actionItems: { where: { userId: request.authUser!.id, resolvedAt: null } } } }); if (!p) return app.httpErrors.notFound('Pull request not found'); return { ...prShape(p), hasDescription: Boolean(p.description) }; });
  app.get('/pull-requests/:id/description', async request => { const { id } = request.params as { id: string }; const p = await prisma.pullRequest.findFirst({ where: { id, ...scopedPrWhere(request.authUser!.id) }, select: { id: true, description: true } }); if (!p) return app.httpErrors.notFound('Pull request not found'); return { id: p.id, description: p.description || 'No description provided.' }; });
  app.get('/inbox', async request => { const records = await prisma.actionItem.findMany({ where: { userId: request.authUser!.id, resolvedAt: null, pullRequest: scopedPrWhere(request.authUser!.id) }, include: { pullRequest: { include: { repository: true, actionItems: { where: { userId: request.authUser!.id, resolvedAt: null } } } } }, orderBy: { lastSeenAt: 'desc' } }); return { total: records.length, data: records.map(a => ({ id: a.id, reason: a.reason, pullRequest: prShape(a.pullRequest) })), coverage: records.length ? 'live' : 'not_connected' }; });
  app.get('/analytics/overview', async request => {
    const userId = request.authUser!.id;
    const where = scopedPrWhere(userId);
    const usernames = await connectedUsernames(userId);
    const authored = { ...where, authorLogin: { in: usernames } };
    const [openPullRequests, mergedPullRequests, repositories, actionItems, failingChecks, last] = await Promise.all([
      prisma.pullRequest.count({ where: { ...authored, state: 'OPEN' } }),
      prisma.pullRequest.count({ where: { ...authored, state: 'MERGED' } }),
      prisma.repository.count({ where: { userAccess: { some: { userId, status: 'active', relationships: { hasSome: ['OWNED', 'COLLABORATING'] } } } } }),
      prisma.actionItem.count({ where: { userId, resolvedAt: null, pullRequest: where } }),
      prisma.pullRequest.count({ where: { ...where, ciStatus: 'FAILING' } }),
      prisma.userRepositoryAccess.findFirst({ where: { userId, status: 'active' }, orderBy: { lastVerifiedAt: 'desc' } }),
    ]);
    return { openPullRequests, mergedPullRequests, actionItems, failingChecks, repositories, lastSuccessfulSync: last?.lastVerifiedAt?.toISOString() ?? null, coverage: repositories ? 'live' : 'not_connected' };
  });
  app.post('/webhooks/github', async (_request, reply) => reply.code(501).send({ error: 'Webhooks are disabled until raw-body signature verification is configured; use reconciliation sync.' }));
  app.setErrorHandler((error, _request, reply) => { if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid request', details: error.flatten() }); app.log.error(error); const failure = error as Error & { statusCode?: number }; return reply.code(failure.statusCode ?? 500).send({ error: failure.statusCode ? failure.message : 'Internal server error' }); });
  app.addHook('onClose', async () => prisma.$disconnect());
  return app;
}

const entrypoint = process.argv[1]?.replace(/\\/g, '/') ?? '';
if (entrypoint.endsWith('apps/api/src/main.ts') || entrypoint.endsWith('apps/api/dist/main.js')) { const app = await buildApp({ logger: true }); await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' }); }
