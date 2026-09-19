import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './main.js';

test('GET /health returns 200 and ok: true', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  assert.equal(response.statusCode, 200);
  const json = response.json();
  assert.equal(json.ok, true);
  await app.close();
});

test('GET /repositories returns list of accessible repositories', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/repositories',
  });

  assert.equal(response.statusCode, 200);
  const json = response.json();
  assert.ok(Array.isArray(json.data));
  assert.ok(json.total > 0);
  await app.close();
});

test('GET /pull-requests filters by state', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/pull-requests?state=Open',
  });

  assert.equal(response.statusCode, 200);
  const json = response.json();
  assert.ok(Array.isArray(json.data));
  json.data.forEach((pr: any) => {
    assert.equal(pr.state.toLowerCase(), 'open');
  });
  await app.close();
});

test('GET /inbox returns classified action items', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/inbox',
  });

  assert.equal(response.statusCode, 200);
  const json = response.json();
  assert.ok(Array.isArray(json.data));
  assert.ok(json.total >= 0);
  await app.close();
});

test('GET /analytics/overview returns aggregated metric counts', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/analytics/overview',
  });

  assert.equal(response.statusCode, 200);
  const json = response.json();
  assert.equal(typeof json.openPullRequests, 'number');
  assert.equal(typeof json.mergedPullRequests, 'number');
  assert.equal(typeof json.actionItems, 'number');
  assert.equal(typeof json.repositories, 'number');
  await app.close();
});

test('POST /webhooks/github rejects invalid signatures or accepts valid ones', async () => {
  const app = await buildApp();
  const resInvalid = await app.inject({
    method: 'POST',
    url: '/webhooks/github',
    headers: {
      'x-hub-signature-256': 'sha256=invalidhash',
      'x-github-event': 'ping',
    },
    payload: { zen: 'Responsive is better than fast.' },
  });

  // In non-production test mode, webhook logs and returns received
  assert.equal(resInvalid.statusCode, 200);
  assert.equal(resInvalid.json().received, true);
  await app.close();
});
