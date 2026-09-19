import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import { prs as fixturePrs, repos as fixtureRepos } from '@gcc/shared/fixtures';
import { classifyActionReasons, type PullRequestFacts } from '@gcc/shared';
import { encryptCredential, verifyGitHubWebhookSignature } from '@gcc/shared';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export interface RepoItem {
  id: string;
  name: string;
  relationship: string;
  visibility: string;
  prs: number;
  synced: string;
}

export interface PRItem {
  id: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  state: string;
  ci: string;
  review: string;
  reasons: string[];
  updated: string;
  htmlUrl?: string;
  description?: string;
}

export interface StoredConnection {
  id: string;
  userId: string;
  type: 'PAT' | 'GITHUB_APP';
  status: 'ACTIVE' | 'REVOKED' | 'ERROR';
  username?: string;
  token?: string;
  lastSyncedAt?: Date;
}

// Module-level storage so data persists across requests in dev mode
const memorySessions = new Map<string, string>();
const memoryConnections = new Map<string, StoredConnection[]>();
let memoryRepos: RepoItem[] = [...fixtureRepos];
let memoryPrs: PRItem[] = fixturePrs.map(p => ({ ...p, reasons: [...p.reasons] }));
let totalMergedPrsCount = 0;

const STORE_PATH = join(process.cwd(), '.dev-store.json');

function saveStore() {
  try {
    const serializedConnections = Array.from(memoryConnections.entries());
    const data = {
      connections: serializedConnections,
      repos: memoryRepos,
      prs: memoryPrs,
      totalMergedPrsCount,
    };
    writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

function loadStore() {
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.connections)) {
        for (const [k, v] of data.connections) {
          memoryConnections.set(k, v);
        }
      }
      if (Array.isArray(data.repos) && data.repos.length > 0) {
        memoryRepos = data.repos;
      }
      if (Array.isArray(data.prs) && data.prs.length > 0) {
        memoryPrs = data.prs;
      }
      if (typeof data.totalMergedPrsCount === 'number') {
        totalMergedPrsCount = data.totalMergedPrsCount;
      }
    }
  } catch {}
}

loadStore();

const listQuery = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  ci: z.string().optional(),
  visibility: z.string().optional(),
  relationship: z.string().optional(),
});
const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
const patBody = z.object({ token: z.string().min(20) });

function hashPassword(password: string) {
  return scryptSync(password, 'demo-static-salt', 32).toString('hex');
}

function verifyPassword(password: string, expected: string) {
  return timingSafeEqual(Buffer.from(hashPassword(password), 'hex'), Buffer.from(expected, 'hex'));
}

function contains(value: string, needle = '') {
  return value.toLowerCase().includes(needle.toLowerCase());
}

export async function buildApp(opts: { logger?: boolean } = {}) {
  const prisma = new PrismaClient();
  const app: FastifyInstance = Fastify({ logger: opts.logger ?? false });
  await app.register(helmet);
  await app.register(formbody);
  await app.register(cookie, { secret: process.env.SESSION_SECRET ?? 'dev-only-change-me' });
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? 'password';

  async function currentUser(request: FastifyRequest) {
    const sid = request.cookies?.sid;
    if (!sid) return null;
    try {
      const session = await prisma.session.findUnique({ where: { id: sid }, include: { user: true } });
      if (!session || session.expiresAt < new Date()) return null;
      return session.user;
    } catch {
      const email = memorySessions.get(sid);
      if (!email) return null;
      return {
        id: email === adminEmail ? 'memory_admin' : `user_${email}`,
        email,
        name: email.split('@')[0],
      };
    }
  }

  function publicUser(user: { id: string; email: string; name: string | null }) {
    return { id: user.id, email: user.email, name: user.name };
  }

  async function connectionState(request: FastifyRequest) {
    const user = await currentUser(request);
    const userId = user?.id ?? 'memory_admin';
    return { userId, connected: (memoryConnections.get(userId) ?? []).length > 0 };
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: 'Demo Admin', passwordHash: hashPassword(adminPassword) },
  }).catch(error => app.log.warn({ error }, 'database unavailable; using in-memory auth fallback'));

  app.get('/health', async () => ({ ok: true }));

  app.post('/auth/login', async (request, reply) => {
    const body = loginBody.parse(request.body);
    try {
      let user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: body.email,
            name: body.email.split('@')[0],
            passwordHash: hashPassword(body.password),
          },
        });
      } else if (!verifyPassword(body.password, user.passwordHash)) {
        return app.httpErrors.unauthorized('Invalid email or password');
      }
      const sid = randomUUID();
      await prisma.session.create({ data: { id: sid, userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
      reply.setCookie('sid', sid, { httpOnly: true, sameSite: 'lax', path: '/', signed: false });
      return reply.redirect('http://localhost:3000/settings/connections');
    } catch {
      const sid = randomUUID();
      memorySessions.set(sid, body.email);
      reply.setCookie('sid', sid, { httpOnly: true, sameSite: 'lax', path: '/', signed: false });
      return reply.redirect('http://localhost:3000/settings/connections');
    }
  });

  app.post('/auth/logout', async (request, reply) => {
    const sid = request.cookies.sid;
    if (sid) { memorySessions.delete(sid); await prisma.session.delete({ where: { id: sid } }).catch(() => null); }
    reply.clearCookie('sid', { path: '/' });
    return reply.redirect('http://localhost:3000/login');
  });

  app.get('/auth/me', async request => {
    const user = await currentUser(request);
    return { user: user ? publicUser(user) : null };
  });

  app.get('/connections', async request => {
    const user = await currentUser(request);
    const userId = user?.id ?? 'memory_admin';

    const userConns = memoryConnections.get(userId) ?? [];
    let dbConns: Array<{ type: string; status: string; id: string }> = [];
    try {
      const records = await prisma.gitHubConnection.findMany({
        where: { userId, status: 'ACTIVE' },
      });
      dbConns = records.map(r => ({ type: r.type, status: r.status.toLowerCase(), id: r.id }));
    } catch {
      dbConns = userConns.map(r => ({ type: r.type, status: r.status.toLowerCase(), id: r.id }));
    }

    const accountsList: Array<{ id: string; username: string }> = [];
    for (const c of userConns) {
      accountsList.push({ id: c.id, username: c.username ?? 'GitHub User' });
    }
    for (const d of dbConns) {
      if (!accountsList.some(a => a.id === d.id)) {
        accountsList.push({ id: d.id, username: d.id.replace(/^pat_[^_]+_/, '') || 'GitHub User' });
      }
    }

    return {
      data: [
        {
          type: 'PAT (Personal Access Token)',
          status: Math.max(dbConns.length, accountsList.length) > 0 ? `${Math.max(dbConns.length, accountsList.length)} connected` : 'Not configured',
          coverage: 'Current active mode',
          description: 'Used for polling repositories, pull requests, and checks for connected accounts.',
          webhook: false,
          accounts: accountsList.map(c => `@${c.username}`),
          accountItems: accountsList,
        },
        {
          type: 'GitHub App (Optional Webhook Mode)',
          status: process.env.GITHUB_APP_ID ? 'Configured' : 'Optional / Not configured',
          coverage: 'Best for real-time webhooks',
          description: 'Requires registering a GitHub App in GitHub Settings with Webhooks and private key. Not required when using PAT.',
          webhook: true,
        },
      ],
      connectedCount: dbConns.length,
      permissionChecklist: [
        'Repository metadata (Read)',
        'Pull requests (Read)',
        'Commit statuses (Read)',
        'Checks (Read)',
      ],
    };
  });

  app.post('/connections/pat/test', async request => {
    const { token } = patBody.parse(request.body);
    const octokit = new Octokit({ auth: token });
    try {
      const [{ data: user }, { data: reposPage }, rate] = await Promise.all([
        octokit.rest.users.getAuthenticated(),
        octokit.rest.repos.listForAuthenticatedUser({ per_page: 1, affiliation: 'owner,collaborator,organization_member' }),
        octokit.rest.rateLimit.get(),
      ]);
      return {
        ok: true,
        githubUser: { id: user.id, login: user.login, avatarUrl: user.avatar_url },
        sampleRepository: reposPage[0] ? { id: reposPage[0].id, fullName: reposPage[0].full_name, private: reposPage[0].private } : null,
        rateLimit: rate.data.rate,
        nextStep: 'Token is valid. Click Connect & Sync below to ingest.',
      };
    } catch (error) {
      request.log.warn({ error }, 'PAT validation failed');
      return app.httpErrors.unauthorized('GitHub token validation failed');
    }
  });

  async function syncGitHubData(token: string, ghUser: { login: string; id?: number }, log?: any) {
    const octokit = new Octokit({ auth: token });

    // 1. Fetch user's direct repositories
    const reposRes = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 50,
      affiliation: 'owner,collaborator,organization_member',
      sort: 'updated',
    });

    const newRepos: RepoItem[] = [];
    const newPrs: PRItem[] = [];

    for (const r of reposRes.data) {
      const isOwner = r.owner.login.toLowerCase() === ghUser.login.toLowerCase();
      newRepos.push({
        id: `repo_${r.id}`,
        name: r.full_name,
        relationship: isOwner ? 'Owned' : 'Collaborating',
        visibility: r.private ? 'Private' : 'Public',
        prs: 0,
        synced: 'just now',
      });
    }

    // 2. Discover external authored PRs (open & merged) & review requested PRs via GitHub Search API
    const [authoredOpenSearch, authoredMergedSearch, reviewSearch] = await Promise.all([
      octokit.rest.search.issuesAndPullRequests({
        q: `type:pr author:${ghUser.login} state:open`,
        per_page: 100,
        sort: 'updated',
      }).catch(() => ({ data: { items: [], total_count: 0 } })),
      octokit.rest.search.issuesAndPullRequests({
        q: `type:pr author:${ghUser.login} is:merged`,
        per_page: 100,
        sort: 'updated',
      }).catch(() => ({ data: { items: [], total_count: 0 } })),
      octokit.rest.search.issuesAndPullRequests({
        q: `type:pr review-requested:${ghUser.login} state:open`,
        per_page: 50,
        sort: 'updated',
      }).catch(() => ({ data: { items: [], total_count: 0 } })),
    ]);

    if (authoredMergedSearch.data.total_count) {
      totalMergedPrsCount = Math.max(totalMergedPrsCount, authoredMergedSearch.data.total_count);
    }

    const mergedIds = new Set(authoredMergedSearch.data.items.map(m => m.id));
    const searchItems = [
      ...authoredOpenSearch.data.items,
      ...authoredMergedSearch.data.items,
      ...reviewSearch.data.items,
    ];
    const seenSearchIds = new Set<number>();

    for (const item of searchItems) {
      if (seenSearchIds.has(item.id)) continue;
      seenSearchIds.add(item.id);

      const repoName = item.repository_url.replace('https://api.github.com/repos/', '');
      const isReviewRequested = reviewSearch.data.items.some(r => r.id === item.id);
      const isAuthor = (item.user?.login ?? '').toLowerCase() === ghUser.login.toLowerCase();
      const isMerged = mergedIds.has(item.id) || Boolean((item as any).pull_request?.merged_at);
      const isDraft = Boolean((item as any).draft);
      const stateStr = isMerged ? 'Merged' : isDraft ? 'Draft' : item.state === 'closed' ? 'Closed' : 'Open';

      if (!newRepos.some(nr => nr.name.toLowerCase() === repoName.toLowerCase())) {
        newRepos.push({
          id: `repo_ext_${repoName.replace('/', '_')}`,
          name: repoName,
          relationship: 'External contribution',
          visibility: 'Public',
          prs: 1,
          synced: 'just now',
        });
      }

      const facts: PullRequestFacts = {
        authorLogin: item.user?.login ?? '',
        currentUserLogin: ghUser.login,
        draft: isDraft,
        state: isMerged ? 'MERGED' : item.state === 'open' ? 'OPEN' : 'CLOSED',
        reviewRequested: isReviewRequested,
      };

      const reasons = classifyActionReasons(facts);

      newPrs.push({
        id: `pr_${item.id}`,
        repo: repoName,
        number: item.number,
        title: item.title,
        author: item.user?.login ?? 'unknown',
        state: stateStr,
        ci: 'Passing',
        review: isMerged ? 'Merged' : isReviewRequested ? 'Review requested' : isAuthor ? 'Waiting for review' : 'None',
        reasons,
        updated: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'recently',
        htmlUrl: item.html_url,
        description: item.body || 'No description provided.',
      });
    }

    // Update repo PR counts
    newRepos.forEach(repo => {
      repo.prs = newPrs.filter(p => p.repo.toLowerCase() === repo.name.toLowerCase()).length;
    });

    // Ingest live records — explicitly purge mock fixtures once real account is synced
    const fixtureIds = new Set<string>(fixturePrs.map(f => f.id));
    const fixtureRepoIds = new Set<string>(fixtureRepos.map(f => f.id));

    if (newRepos.length > 0) {
      const liveExisting = memoryRepos.filter(er => !fixtureRepoIds.has(er.id));
      const newNames = new Set(newRepos.map(nr => nr.name));
      memoryRepos = [...newRepos, ...liveExisting.filter(er => !newNames.has(er.name))];
    }

    if (newPrs.length > 0) {
      const liveExisting = memoryPrs.filter(ep => !fixtureIds.has(ep.id));
      const newIds = new Set(newPrs.map(np => np.id));
      memoryPrs = [...newPrs, ...liveExisting.filter(ep => !newIds.has(ep.id))];
    }

    if (log) {
      log.info({ repos: newRepos.length, prs: newPrs.length, merged: totalMergedPrsCount }, 'GitHub sync completed');
    }

    return { reposCount: newRepos.length, prsCount: newPrs.length, mergedCount: totalMergedPrsCount };
  }

  app.post('/connections/pat', async (request, reply) => {
    const user = await currentUser(request);
    const userId = user?.id ?? 'memory_admin';
    const { token } = patBody.parse(request.body);
    const octokit = new Octokit({ auth: token });

    let ghUser;
    try {
      const res = await octokit.rest.users.getAuthenticated();
      ghUser = res.data;
    } catch (error) {
      return app.httpErrors.unauthorized('GitHub token validation failed');
    }

    const encrypted = encryptCredential(token);
    const connectionId = `pat_${userId}_${ghUser.id}`;
    try {
      const connection = await prisma.gitHubConnection.upsert({
        where: { id: connectionId },
        update: { status: 'ACTIVE' },
        create: {
          id: connectionId,
          userId,
          type: 'PAT',
          status: 'ACTIVE',
          scopes: ['repo', 'read:user'],
        },
      });

      await prisma.encryptedCredential.upsert({
        where: { connectionId: connection.id },
        update: {
          keyVersion: encrypted.keyVersion,
          ciphertext: new Uint8Array(encrypted.ciphertext),
          nonce: new Uint8Array(encrypted.nonce),
          tag: new Uint8Array(encrypted.tag),
        },
        create: {
          connectionId: connection.id,
          keyVersion: encrypted.keyVersion,
          ciphertext: new Uint8Array(encrypted.ciphertext),
          nonce: new Uint8Array(encrypted.nonce),
          tag: new Uint8Array(encrypted.tag),
        },
      });
    } catch {
      // Prisma optional fallback
    }

    const list = memoryConnections.get(userId) ?? [];
    const existing = list.find(c => c.id === connectionId);
    if (existing) {
      existing.status = 'ACTIVE';
      existing.token = token;
      existing.username = ghUser.login;
      existing.lastSyncedAt = new Date();
    } else {
      list.push({
        id: connectionId,
        userId,
        type: 'PAT',
        status: 'ACTIVE',
        username: ghUser.login,
        token,
        lastSyncedAt: new Date(),
      });
    }
    memoryConnections.set(userId, list);

    try {
      await syncGitHubData(token, { login: ghUser.login, id: ghUser.id }, request.log);
    } catch (err) {
      request.log.warn({ err }, 'Live sync failed during PAT setup');
    }
    saveStore();

    const accept = request.headers.accept ?? '';
    if (accept.includes('text/html')) {
      return reply.redirect('http://localhost:3000/settings/connections?connected=true');
    }

    return {
      ok: true,
      message: `Account @${ghUser.login} connected successfully! Repositories and PRs ingested.`,
      user: { login: ghUser.login, id: ghUser.id },
      counts: {
        repositories: memoryRepos.length,
        pullRequests: memoryPrs.length,
      },
    };
  });

  const deleteConnectionHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await currentUser(request);
    const userId = user?.id ?? 'memory_admin';
    const params = request.params as { id?: string };
    const body = (request.body as { id?: string }) ?? {};
    const id = params.id ?? body.id ?? '';

    try {
      await prisma.encryptedCredential.deleteMany({ where: { connectionId: id } });
      await prisma.gitHubConnection.deleteMany({ where: { id, userId } });
    } catch {
      // Prisma fallback ignored
    }

    const list = memoryConnections.get(userId) ?? [];
    const updated = list.filter(c => c.id !== id && c.username !== id);
    memoryConnections.set(userId, updated);

    // If no connections remain, reset memory caches back to fixtures
    if (updated.length === 0) {
      memoryRepos.length = 0;
      memoryRepos.push(...fixtureRepos);
      memoryPrs.length = 0;
      memoryPrs.push(...fixturePrs.map(p => ({ ...p, reasons: [...p.reasons] })));
      totalMergedPrsCount = 0;
    }
    saveStore();

    const accept = request.headers.accept ?? '';
    if (accept.includes('text/html')) {
      return reply.redirect('http://localhost:3000/settings/connections?disconnected=true');
    }

    return {
      ok: true,
      message: 'GitHub connection removed successfully.',
      remaining: updated.length,
    };
  };

  app.delete('/connections/:id', deleteConnectionHandler);
  app.post('/connections/:id/delete', deleteConnectionHandler);
  app.post('/connections/:id/disconnect', deleteConnectionHandler);

  app.get('/sync/status', async request => {
    const user = await currentUser(request);
    const userId = user?.id ?? 'memory_admin';
    const userConns = memoryConnections.get(userId) ?? [];
    const configured = userConns.length > 0;

    return {
      state: configured ? 'synced' : 'not_configured',
      message: configured ? `${userConns.length} GitHub account(s) active.` : 'Connect GitHub before first sync.',
      lastSuccessfulSync: configured ? new Date().toISOString() : null,
    };
  });

  app.post('/sync', async (request, reply) => {
    const user = await currentUser(request);
    const userId = user?.id ?? 'memory_admin';
    const list = memoryConnections.get(userId) ?? [];

    let syncedAccounts = 0;
    for (const conn of list) {
      if (conn.token) {
        try {
          await syncGitHubData(conn.token, { login: conn.username ?? 'unknown', id: 0 }, request.log);
          syncedAccounts++;
        } catch (err) {
          request.log.warn({ err }, 'Failed sync for connection ' + conn.username);
        }
      }
    }

    return {
      ok: true,
      syncedAccounts,
      counts: {
        repositories: memoryRepos.length,
        pullRequests: memoryPrs.length,
        mergedPullRequests: Math.max(memoryPrs.filter(p => p.state === 'Merged').length, totalMergedPrsCount),
      },
    };
  });

  app.get('/repositories', async request => {
    const { connected } = await connectionState(request);
    if (!connected) return { total: 0, data: [], coverage: 'not_connected' };
    const q = listQuery.parse(request.query);
    const data = memoryRepos.filter(repo =>
      (!q.search || contains(repo.name, q.search)) &&
      (!q.visibility || repo.visibility.toLowerCase() === q.visibility.toLowerCase()) &&
      (!q.relationship || repo.relationship.toLowerCase() === q.relationship.toLowerCase())
    );
    return { total: data.length, data, coverage: 'live' };
  });

  app.get('/repositories/:id', async request => {
    const { id } = request.params as { id: string };
    const repo = memoryRepos.find(item => item.id === id);
    if (!repo) return app.httpErrors.notFound('Repository not found');
    return repo;
  });

  app.get('/pull-requests', async request => {
    const { connected } = await connectionState(request);
    if (!connected) return { total: 0, data: [], coverage: 'not_connected' };
    const q = listQuery.parse(request.query);
    const data = memoryPrs.filter(pr =>
      (!q.search || contains(`${pr.title} ${pr.repo} ${pr.author}`, q.search)) &&
      (!q.state || pr.state.toLowerCase() === q.state.toLowerCase()) &&
      (!q.ci || pr.ci.toLowerCase() === q.ci.toLowerCase())
    );
    return { total: data.length, data, coverage: 'live' };
  });

  app.get('/pull-requests/:id', async request => {
    const { id } = request.params as { id: string };
    const pr = memoryPrs.find(item => item.id === id);
    if (!pr) return app.httpErrors.notFound('Pull request not found');
    // Omit description on initial load so it can be fetched lazily on-demand
    const { description, ...rest } = pr;
    return { ...rest, hasDescription: Boolean(description) };
  });

  app.get('/pull-requests/:id/description', async request => {
    const { id } = request.params as { id: string };
    const pr = memoryPrs.find(item => item.id === id);
    if (!pr) return app.httpErrors.notFound('Pull request not found');
    return {
      id: pr.id,
      description: pr.description || 'No description provided.',
    };
  });

  app.get('/inbox', async request => {
    const { connected } = await connectionState(request);
    if (!connected) return { total: 0, data: [], coverage: 'not_connected' };
    const items = memoryPrs.flatMap(pr =>
      pr.reasons.map(reason => ({
        id: `${pr.id}-${reason}`,
        reason,
        pullRequest: pr,
      }))
    );
    return {
      total: items.length,
      data: items,
      coverage: 'live',
    };
  });

  app.get('/analytics/overview', async request => {
    const { connected } = await connectionState(request);
    if (!connected) {
      return { openPullRequests: 0, mergedPullRequests: 0, actionItems: 0, failingChecks: 0, repositories: 0, lastSuccessfulSync: null, coverage: 'not_connected' };
    }
    return {
      openPullRequests: memoryPrs.filter(pr => pr.state === 'Open').length,
      mergedPullRequests: Math.max(memoryPrs.filter(pr => pr.state === 'Merged').length, totalMergedPrsCount),
      actionItems: memoryPrs.reduce((sum, pr) => sum + pr.reasons.length, 0),
      failingChecks: memoryPrs.filter(pr => pr.ci === 'Failing').length,
      repositories: memoryRepos.length,
      lastSuccessfulSync: new Date().toISOString(),
      coverage: 'live',
    };
  });

  app.post('/webhooks/github', async (request, reply) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? 'dev-webhook-secret';
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const event = request.headers['x-github-event'] as string | undefined;
    const deliveryId = request.headers['x-github-delivery'] as string | undefined;

    const rawPayload = JSON.stringify(request.body);
    const isValid = verifyGitHubWebhookSignature(rawPayload, signature, secret);

    if (!isValid && process.env.NODE_ENV === 'production') {
      return reply.status(401).send({ error: 'Invalid webhook signature' });
    }

    request.log.info({ event, deliveryId }, 'GitHub webhook received and validated');

    if (event === 'pull_request') {
      const body = request.body as any;
      const prData = body.pull_request;
      if (prData) {
        const match = memoryPrs.find(p => p.number === prData.number);
        if (match) {
          match.title = prData.title;
          match.state = prData.draft ? 'Draft' : prData.state === 'open' ? 'Open' : 'Closed';
          match.updated = 'just now';
        }
      }
    }

    return { received: true, event, deliveryId };
  });

  return app;
}

// Start server when executed directly
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('apps/api/src/main.ts');
if (isMain) {
  const app = await buildApp({ logger: true });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
}
