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
const credentialsBody = z.object({ email: z.string().email(), password: z.string().min(12).max(200) });
const patBody = z.object({ token: z.string().min(20).max(500) });

type AuthUser = { id: string; email: string; name: string | null };

declare module 'fastify' { interface FastifyRequest { authUser: AuthUser | null } }

function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`;
}
function verifyPassword(password: string, stored: string) {
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
  const { data: ghUser } = await octokit.rest.users.getAuthenticated();
  const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({ per_page: 100, affiliation: 'owner,collaborator,organization_member', sort: 'updated' });
  const seenRepositoryIds: string[] = [];
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
      where: { userId_repositoryId: { userId, repositoryId: record.id } },
      update: { connectionId, relationships: [relationship], status: 'active', lastVerifiedAt: new Date() },
      create: { userId, repositoryId: record.id, connectionId, relationships: [relationship], status: 'active', lastVerifiedAt: new Date() },
    });
    const { data: prs } = await octokit.rest.pulls.list({ owner: repo.owner.login, repo: repo.name, state: 'all', per_page: 100, sort: 'updated', direction: 'desc' });
    for (const pr of prs) {
      const state: PullRequestState = pr.merged_at ? 'MERGED' : pr.state === 'open' ? 'OPEN' : 'CLOSED';
      const dbPr = await prisma.pullRequest.upsert({
        where: { repositoryId_number: { repositoryId: record.id, number: pr.number } },
        update: { title: pr.title, authorLogin: pr.user?.login ?? 'unknown', state, draft: pr.draft ?? false, mergedAt: pr.merged_at ? new Date(pr.merged_at) : null, closedAt: pr.closed_at ? new Date(pr.closed_at) : null, htmlUrl: pr.html_url, description: pr.body, lastSyncedAt: new Date() },
        create: { repositoryId: record.id, githubNodeId: pr.node_id, number: pr.number, title: pr.title, authorLogin: pr.user?.login ?? 'unknown', state, draft: pr.draft ?? false, openedAt: new Date(pr.created_at), mergedAt: pr.merged_at ? new Date(pr.merged_at) : null, closedAt: pr.closed_at ? new Date(pr.closed_at) : null, htmlUrl: pr.html_url, description: pr.body },
      });
      const facts: PullRequestFacts = { authorLogin: pr.user?.login ?? '', currentUserLogin: ghUser.login, draft: pr.draft ?? false, state, reviewRequested: (pr.requested_reviewers ?? []).some(r => 'login' in r && r.login?.toLowerCase() === ghUser.login.toLowerCase()) };
      const activeReasons = classifyActionReasons(facts);
      await prisma.actionItem.updateMany({ where: { userId, pullRequestId: dbPr.id, reason: { notIn: activeReasons }, resolvedAt: null }, data: { resolvedAt: new Date() } });
      for (const reason of activeReasons) await prisma.actionItem.upsert({ where: { userId_pullRequestId_reason: { userId, pullRequestId: dbPr.id, reason } }, update: { lastSeenAt: new Date(), resolvedAt: null }, create: { userId, pullRequestId: dbPr.id, reason, evidence: { source: 'github-sync' } } });
      pullRequests++;
    }
  }
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
    if (path === '/health' || path === '/auth/register' || path === '/auth/login' || path === '/auth/me') return;
    if (!request.authUser) return reply.code(401).send({ error: 'Authentication required' });
  });

  app.get('/health', async () => { await prisma.$queryRaw`SELECT 1`; return { ok: true }; });
  app.post('/auth/register', async (request, reply) => {
    const body = credentialsBody.parse(request.body);
    const allowRegistration = process.env.ALLOW_REGISTRATION === 'true' || (await prisma.user.count()) === 0;
    if (!allowRegistration) return reply.code(403).send({ error: 'Registration is disabled' });
    if (await prisma.user.findUnique({ where: { email: body.email } })) return reply.code(409).send({ error: 'Account already exists' });
    const user = await prisma.user.create({ data: { email: body.email.toLowerCase(), name: body.email.split('@')[0], passwordHash: hashPassword(body.password) } });
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
    const { token } = patBody.parse(request.body);
    const octokit = new Octokit({ auth: token });
    let ghUser;
    try { ghUser = (await octokit.rest.users.getAuthenticated()).data; } catch { return reply.code(401).send({ error: 'GitHub token validation failed' }); }
    const userId = request.authUser!.id;
    const id = `pat_${userId}_${ghUser.id}`;
    const encrypted = encryptCredential(token);
    await prisma.$transaction(async tx => {
      await tx.gitHubConnection.upsert({ where: { id }, update: { status: 'ACTIVE', username: ghUser.login, githubUserId: BigInt(ghUser.id) }, create: { id, userId, type: 'PAT', status: 'ACTIVE', username: ghUser.login, githubUserId: BigInt(ghUser.id), scopes: [] } });
      await tx.encryptedCredential.upsert({ where: { connectionId: id }, update: { keyVersion: encrypted.keyVersion, ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, tag: encrypted.tag }, create: { connectionId: id, keyVersion: encrypted.keyVersion, ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, tag: encrypted.tag } });
    });
    const synced = await syncGitHubData(userId, id, token, request.log);
    return { ok: true, user: { login: synced.login, id: synced.id }, counts: { repositories: synced.repositories, pullRequests: synced.pullRequests } };
  });
  app.post('/connections/:id/delete', async request => {
    const { id } = request.params as { id: string }; const userId = request.authUser!.id;
    const connection = await prisma.gitHubConnection.findFirst({ where: { id, userId } });
    if (!connection) return app.httpErrors.notFound('Connection not found');
    await prisma.$transaction([prisma.userRepositoryAccess.updateMany({ where: { userId, connectionId: id }, data: { status: 'revoked' } }), prisma.gitHubConnection.delete({ where: { id } })]);
    return { ok: true };
  });
  app.delete('/connections/:id', async request => { const { id } = request.params as { id: string }; const userId = request.authUser!.id; const c = await prisma.gitHubConnection.findFirst({ where: { id, userId } }); if (!c) return app.httpErrors.notFound('Connection not found'); await prisma.gitHubConnection.delete({ where: { id } }); return { ok: true }; });

  app.post('/sync', async request => {
    const userId = request.authUser!.id;
    const connections = await prisma.gitHubConnection.findMany({ where: { userId, status: 'ACTIVE' }, include: { credential: true } });
    let syncedAccounts = 0;
    for (const c of connections) if (c.credential) { const token = decryptCredential({ ciphertext: Buffer.from(c.credential.ciphertext), nonce: Buffer.from(c.credential.nonce), tag: Buffer.from(c.credential.tag) }); await syncGitHubData(userId, c.id, token, request.log); syncedAccounts++; }
    return { ok: true, syncedAccounts };
  });
  app.get('/sync/status', async request => { const count = await prisma.gitHubConnection.count({ where: { userId: request.authUser!.id, status: 'ACTIVE' } }); const last = await prisma.userRepositoryAccess.findFirst({ where: { userId: request.authUser!.id, status: 'active' }, orderBy: { lastVerifiedAt: 'desc' }, select: { lastVerifiedAt: true } }); return { state: count ? 'synced' : 'not_configured', message: count ? `${count} GitHub account(s) active.` : 'Connect GitHub before first sync.', lastSuccessfulSync: last?.lastVerifiedAt?.toISOString() ?? null }; });

  const accessWhere = (userId: string) => ({ userAccess: { some: { userId, status: 'active' } } });
  app.get('/repositories', async request => { const q = listQuery.parse(request.query); const records = await prisma.repository.findMany({ where: { ...accessWhere(request.authUser!.id), ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}), ...(q.visibility ? { visibility: q.visibility.toUpperCase() as RepositoryVisibility } : {}) }, include: { userAccess: { where: { userId: request.authUser!.id, status: 'active' } }, _count: { select: { pullRequests: true } } }, orderBy: { updatedAt: 'desc' } }); const data = records.map(r => ({ id: r.id, name: r.name, relationship: relationLabel(r.userAccess[0]?.relationships ?? []), visibility: r.visibility[0] + r.visibility.slice(1).toLowerCase(), prs: r._count.pullRequests, synced: r.userAccess[0]?.lastVerifiedAt?.toISOString() ?? 'pending' })).filter(r => !q.relationship || r.relationship.toLowerCase() === q.relationship.toLowerCase()); return { total: data.length, data, coverage: data.length ? 'live' : 'not_connected' }; });
  app.get('/repositories/:id', async request => { const { id } = request.params as { id: string }; const r = await prisma.repository.findFirst({ where: { id, ...accessWhere(request.authUser!.id) }, include: { userAccess: { where: { userId: request.authUser!.id, status: 'active' } }, _count: { select: { pullRequests: true } } } }); if (!r) return app.httpErrors.notFound('Repository not found'); return { id: r.id, name: r.name, relationship: relationLabel(r.userAccess[0].relationships), visibility: r.visibility, prs: r._count.pullRequests, synced: r.userAccess[0].lastVerifiedAt?.toISOString() ?? 'pending' }; });

  const prShape = (p: any) => ({ id: p.id, repo: p.repository.name, number: p.number, title: p.title, author: p.authorLogin, state: p.draft ? 'Draft' : p.state[0] + p.state.slice(1).toLowerCase(), ci: p.ciStatus, review: p.reviewStatus, reasons: p.actionItems?.map((a: any) => a.reason) ?? [], updated: p.lastSyncedAt.toISOString(), htmlUrl: p.htmlUrl });
  const scopedPrWhere = (userId: string) => ({ repository: accessWhere(userId) });
  app.get('/pull-requests', async request => { const q = listQuery.parse(request.query); const records = await prisma.pullRequest.findMany({ where: { ...scopedPrWhere(request.authUser!.id), ...(q.search ? { OR: [{ title: { contains: q.search, mode: 'insensitive' as const } }, { repository: { name: { contains: q.search, mode: 'insensitive' as const }, ...accessWhere(request.authUser!.id) } }] } : {}), ...(q.state ? { state: q.state.toUpperCase() as PullRequestState } : {}), ...(q.ci ? { ciStatus: q.ci.toUpperCase() } : {}) }, include: { repository: true, actionItems: { where: { userId: request.authUser!.id, resolvedAt: null } } }, orderBy: { lastSyncedAt: 'desc' } }); return { total: records.length, data: records.map(prShape), coverage: records.length ? 'live' : 'not_connected' }; });
  app.get('/pull-requests/:id', async request => { const { id } = request.params as { id: string }; const p = await prisma.pullRequest.findFirst({ where: { id, ...scopedPrWhere(request.authUser!.id) }, include: { repository: true, actionItems: { where: { userId: request.authUser!.id, resolvedAt: null } } } }); if (!p) return app.httpErrors.notFound('Pull request not found'); return { ...prShape(p), hasDescription: Boolean(p.description) }; });
  app.get('/pull-requests/:id/description', async request => { const { id } = request.params as { id: string }; const p = await prisma.pullRequest.findFirst({ where: { id, ...scopedPrWhere(request.authUser!.id) }, select: { id: true, description: true } }); if (!p) return app.httpErrors.notFound('Pull request not found'); return { id: p.id, description: p.description || 'No description provided.' }; });
  app.get('/inbox', async request => { const records = await prisma.actionItem.findMany({ where: { userId: request.authUser!.id, resolvedAt: null, pullRequest: scopedPrWhere(request.authUser!.id) }, include: { pullRequest: { include: { repository: true, actionItems: { where: { userId: request.authUser!.id, resolvedAt: null } } } } }, orderBy: { lastSeenAt: 'desc' } }); return { total: records.length, data: records.map(a => ({ id: a.id, reason: a.reason, pullRequest: prShape(a.pullRequest) })), coverage: records.length ? 'live' : 'not_connected' }; });
  app.get('/analytics/overview', async request => { const userId = request.authUser!.id; const where = scopedPrWhere(userId); const [openPullRequests, mergedPullRequests, repositories, actionItems, failingChecks, last] = await Promise.all([prisma.pullRequest.count({ where: { ...where, state: 'OPEN' } }), prisma.pullRequest.count({ where: { ...where, state: 'MERGED' } }), prisma.repository.count({ where: accessWhere(userId) }), prisma.actionItem.count({ where: { userId, resolvedAt: null, pullRequest: where } }), prisma.pullRequest.count({ where: { ...where, ciStatus: 'FAILING' } }), prisma.userRepositoryAccess.findFirst({ where: { userId, status: 'active' }, orderBy: { lastVerifiedAt: 'desc' } })]); return { openPullRequests, mergedPullRequests, actionItems, failingChecks, repositories, lastSuccessfulSync: last?.lastVerifiedAt?.toISOString() ?? null, coverage: repositories ? 'live' : 'not_connected' }; });
  app.post('/webhooks/github', async (_request, reply) => reply.code(501).send({ error: 'Webhooks are disabled until raw-body signature verification is configured; use reconciliation sync.' }));
  app.setErrorHandler((error, _request, reply) => { if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid request', details: error.flatten() }); app.log.error(error); return reply.code((error as any).statusCode ?? 500).send({ error: (error as any).statusCode ? error.message : 'Internal server error' }); });
  app.addHook('onClose', async () => prisma.$disconnect());
  return app;
}

const entrypoint = process.argv[1]?.replace(/\\/g, '/') ?? '';
if (entrypoint.endsWith('apps/api/src/main.ts') || entrypoint.endsWith('apps/api/dist/main.js')) { const app = await buildApp({ logger: true }); await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' }); }
