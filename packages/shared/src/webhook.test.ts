import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { verifyGitHubWebhookSignature } from './webhook.js';

test('validates valid GitHub webhook signature', () => {
  const secret = 'webhook-secret-123';
  const payload = JSON.stringify({ action: 'opened', pull_request: { number: 10 } });

  const signature = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  const isValid = verifyGitHubWebhookSignature(payload, signature, secret);

  assert.equal(isValid, true);
});

test('rejects tampered webhook payload or mismatched secret', () => {
  const secret = 'webhook-secret-123';
  const payload = JSON.stringify({ action: 'opened' });
  const signature = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');

  // Tampered payload
  assert.equal(verifyGitHubWebhookSignature(JSON.stringify({ action: 'closed' }), signature, secret), false);

  // Tampered secret
  assert.equal(verifyGitHubWebhookSignature(payload, signature, 'wrong-secret'), false);

  // Missing or invalid header format
  assert.equal(verifyGitHubWebhookSignature(payload, undefined, secret), false);
  assert.equal(verifyGitHubWebhookSignature(payload, 'sha1=invalid', secret), false);
});
