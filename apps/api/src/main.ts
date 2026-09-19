import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { prs, repos } from '@gcc/shared/fixtures';
import Fastify, { type FastifyRequest } from 'fastify';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(sensible);
await app.register(cookie, { secret: process.env.SESSION_SECRET ?? 'dev-only-change-me' });

const demoUser = {
  id: 'user_demo',
  email: process.env.DEMO_ADMIN_EMAIL ?? 'admin@example.com',
  name: 'Demo Admin',
  passwordHash: hashPassword(process.env.DEMO_ADMIN_PASSWORD ?? 'password'),
};
const sessions = new Map<string, string>();

const listQuery = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  visibility: z.string().optional(),
  relationship: z.string().optional(),
});
const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

function hashPassword(password: string) {
  return scryptSync(password, 'demo-static-salt', 32);
}

function verifyPassword(password: string, expected: Buffer) {
  return timingSafeEqual(hashPassword(password), expected);
}

function contains(value: string, needle = '') {
  return value.toLowerCase().includes(needle.toLowerCase());
}

function currentUser(request: FastifyRequest) {
  const sid = request.cookies.sid;
  return sid && sessions.get(sid) === demoUser.id ? demoUser : null;
}

function publicUser() {
  return { id: demoUser.id, email: demoUser.email, name: demoUser.name };
}

app.get('/health', async () => ({ ok: true }));

app.post('/auth/login', async (request, reply) => {
  const body = loginBody.parse(request.body);
  if (body.email !== demoUser.email || !verifyPassword(body.password, demoUser.passwordHash)) {
    return app.httpErrors.unauthorized('Invalid email or password');
  }
  const sid = randomUUID();
  sessions.set(sid, demoUser.id);
  reply.setCookie('sid', sid, { httpOnly: true, sameSite: 'lax', path: '/', signed: false });
  return { user: publicUser() };
});

app.post('/auth/logout', async (request, reply) => {
  const sid = request.cookies.sid;
  if (sid) sessions.delete(sid);
  reply.clearCookie('sid', { path: '/' });
  return { ok: true };
});

app.get('/auth/me', async request => ({ user: currentUser(request) ? publicUser() : null }));

app.get('/connections', async () => ({
  data: [
    { type: 'GITHUB_APP', status: 'not_configured', coverage: 'best', webhook: true },
    { type: 'PAT', status: 'not_configured', coverage: 'fallback', webhook: false },
  ],
  permissionChecklist: [
    'Repository metadata',
    'Pull requests',
    'Commit statuses',
    'Checks',
    'Actions read access when available',
  ],
}));

app.get('/sync/status', async () => ({
  state: 'not_configured',
  message: 'Connect GitHub before first sync.',
  lastSuccessfulSync: null,
}));

app.get('/repositories', async request => {
  const q = listQuery.parse(request.query);
  const data = repos.filter(repo =>
    (!q.search || contains(repo.name, q.search)) &&
    (!q.visibility || repo.visibility === q.visibility) &&
    (!q.relationship || repo.relationship === q.relationship)
  );
  return { total: data.length, data, coverage: 'fixture' };
});

app.get('/repositories/:id', async request => {
  const { id } = request.params as { id: string };
  const repo = repos.find(item => item.id === id);
  if (!repo) return app.httpErrors.notFound('Repository not found');
  return repo;
});

app.get('/pull-requests', async request => {
  const q = listQuery.parse(request.query);
  const data = prs.filter(pr =>
    (!q.search || contains(`${pr.title} ${pr.repo} ${pr.author}`, q.search)) &&
    (!q.state || pr.state === q.state)
  );
  return { total: data.length, data, coverage: 'fixture' };
});

app.get('/pull-requests/:id', async request => {
  const { id } = request.params as { id: string };
  const pr = prs.find(item => item.id === id);
  if (!pr) return app.httpErrors.notFound('Pull request not found');
  return pr;
});

app.get('/inbox', async () => ({
  total: prs.reduce((sum, pr) => sum + pr.reasons.length, 0),
  data: prs.flatMap(pr => pr.reasons.map(reason => ({ id: `${pr.id}-${reason}`, reason, pullRequest: pr }))),
  coverage: 'fixture',
}));

app.get('/analytics/overview', async () => ({
  openPullRequests: prs.filter(pr => pr.state === 'Open').length,
  actionItems: prs.reduce((sum, pr) => sum + pr.reasons.length, 0),
  failingChecks: prs.filter(pr => pr.ci === 'Failing').length,
  repositories: repos.length,
  lastSuccessfulSync: null,
  coverage: 'fixture',
}));

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
