import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { buildApp } from './main.js';

const prisma = new PrismaClient();
const suffix = `${Date.now()}-${Math.random()}`;
let app: Awaited<ReturnType<typeof buildApp>>;
let cookieA = '';
let cookieB = '';
let privateRepoA = '';
let privatePrA = '';

function cookie(response: { headers: Record<string, string | string[] | undefined> }) {
  const value = response.headers['set-cookie'];
  return (Array.isArray(value) ? value[0] : value ?? '').split(';')[0];
}

before(async () => {
  process.env.ALLOW_REGISTRATION = 'true';
  app = await buildApp();
  const register = async (email: string) => app.inject({ method: 'POST', url: '/auth/register', payload: { email, password: 'correct-horse-battery-staple' } });
  const a = await register(`a-${suffix}@example.com`);
  const b = await register(`b-${suffix}@example.com`);
  assert.equal(a.statusCode, 201); assert.equal(b.statusCode, 201);
  cookieA = cookie(a); cookieB = cookie(b);
  const userA = await prisma.user.findUniqueOrThrow({ where: { email: `a-${suffix}@example.com` } });
  const repo = await prisma.repository.create({ data: { githubId: BigInt(Date.now()), owner: 'account-a', name: 'account-a/private-project', visibility: 'PRIVATE' } });
  privateRepoA = repo.id;
  await prisma.userRepositoryAccess.create({ data: { userId: userA.id, repositoryId: repo.id, relationships: ['OWNED'], status: 'active', lastVerifiedAt: new Date() } });
  const pr = await prisma.pullRequest.create({ data: { repositoryId: repo.id, githubNodeId: `node-${suffix}`, number: 1, title: 'A private title', authorLogin: 'account-a', state: 'OPEN', openedAt: new Date(), description: 'A private description' } });
  privatePrA = pr.id;
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [`a-${suffix}@example.com`, `b-${suffix}@example.com`] } } });
  await prisma.repository.deleteMany({ where: { id: privateRepoA } });
  await app.close(); await prisma.$disconnect();
});

test('anonymous data requests are rejected', async () => {
  const response = await app.inject({ method: 'GET', url: '/repositories' });
  assert.equal(response.statusCode, 401);
});

test('user A sees their entitled private data', async () => {
  const repos = await app.inject({ method: 'GET', url: '/repositories', headers: { cookie: cookieA } });
  assert.equal(repos.statusCode, 200);
  assert.equal(repos.json().data.some((r: { id: string }) => r.id === privateRepoA), true);
});

test('user B cannot list or directly access user A data', async () => {
  const [repos, repo, pr, description, overview] = await Promise.all([
    app.inject({ method: 'GET', url: '/repositories', headers: { cookie: cookieB } }),
    app.inject({ method: 'GET', url: `/repositories/${privateRepoA}`, headers: { cookie: cookieB } }),
    app.inject({ method: 'GET', url: `/pull-requests/${privatePrA}`, headers: { cookie: cookieB } }),
    app.inject({ method: 'GET', url: `/pull-requests/${privatePrA}/description`, headers: { cookie: cookieB } }),
    app.inject({ method: 'GET', url: '/analytics/overview', headers: { cookie: cookieB } }),
  ]);
  assert.equal(repos.json().data.some((r: { id: string }) => r.id === privateRepoA), false);
  assert.equal(repo.statusCode, 404); assert.equal(pr.statusCode, 404); assert.equal(description.statusCode, 404);
  assert.equal(overview.json().repositories, 0); assert.equal(overview.json().openPullRequests, 0);
});

test('login does not auto-register unknown users', async () => {
  const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: `unknown-${suffix}@example.com`, password: 'correct-horse-battery-staple' } });
  assert.equal(response.statusCode, 401);
});

test('webhooks fail closed until raw-body verification is available', async () => {
  const response = await app.inject({ method: 'POST', url: '/webhooks/github', headers: { cookie: cookieA }, payload: { action: 'opened' } });
  assert.equal(response.statusCode, 501);
});
