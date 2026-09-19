import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { PrismaClient } from '@prisma/client';
import { prs, repos } from '@gcc/shared/fixtures';
import Fastify, { type FastifyRequest } from 'fastify';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(sensible);
await app.register(cookie, { secret: process.env.SESSION_SECRET ?? 'dev-only-change-me' });

const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? 'admin@example.com';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? 'password';
const memorySessions = new Map<string, string>();

const listQuery = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  visibility: z.string().optional(),
  relationship: z.string().optional(),
});
const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

function hashPassword(password: string) {
  return scryptSync(password, 'demo-static-salt', 32).toString('hex');
}

function verifyPassword(password: string, expected: string) {
  return timingSafeEqual(Buffer.from(hashPassword(password), 'hex'), Buffer.from(expected, 'hex'));
}

function contains(value: string, needle = '') {
  return value.toLowerCase().includes(needle.toLowerCase());
}

async function currentUser(request: FastifyRequest) {
  const sid = request.cookies.sid;
  if (!sid) return null;
  try {
    const session = await prisma.session.findUnique({ where: { id: sid }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) return null;
    return session.user;
  } catch {
    return memorySessions.get(sid) === adminEmail ? { id: 'memory_admin', email: adminEmail, name: 'Demo Admin' } : null;
  }
}

function publicUser(user: { id: string; email: string; name: string | null }) {
  return { id: user.id, email: user.email, name: user.name };
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
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !verifyPassword(body.password, user.passwordHash)) return app.httpErrors.unauthorized('Invalid email or password');
    const sid = randomUUID();
    await prisma.session.create({ data: { id: sid, userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
    reply.setCookie('sid', sid, { httpOnly: true, sameSite: 'lax', path: '/', signed: false });
    return { user: publicUser(user) };
  } catch {
    if (body.email !== adminEmail || body.password !== adminPassword) return app.httpErrors.unauthorized('Invalid email or password');
    const sid = randomUUID();
    memorySessions.set(sid, adminEmail);
    reply.setCookie('sid', sid, { httpOnly: true, sameSite: 'lax', path: '/', signed: false });
    return { user: { id: 'memory_admin', email: adminEmail, name: 'Demo Admin' }, warning: 'database unavailable; session is in-memory' };
  }
});

app.post('/auth/logout', async (request, reply) => {
  const sid = request.cookies.sid;
  if (sid) { memorySessions.delete(sid); await prisma.session.delete({ where: { id: sid } }).catch(() => null); }
  reply.clearCookie('sid', { path: '/' });
  return { ok: true };
});

app.get('/auth/me', async request => {
  const user = await currentUser(request);
  return { user: user ? publicUser(user) : null };
});

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
