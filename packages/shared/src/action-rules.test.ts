import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyActionReasons } from './action-rules.js';

test('classifies one PR with multiple explainable reasons', () => {
  assert.deepEqual(classifyActionReasons({
    authorLogin: 'me',
    currentUserLogin: 'me',
    draft: false,
    state: 'OPEN',
    reviewRequested: false,
    latestReviewState: 'CHANGES_REQUESTED',
    ciState: 'FAILING',
    unresolvedThreads: true,
  }), ['CHANGES_REQUESTED', 'CI_FAILED', 'UNRESOLVED_DISCUSSION', 'WAITING_FOR_REVIEW']);
});

test('labels ready to merge only as a candidate', () => {
  assert.deepEqual(classifyActionReasons({
    authorLogin: 'me',
    currentUserLogin: 'me',
    draft: false,
    state: 'OPEN',
    reviewRequested: false,
    latestReviewState: 'APPROVED',
    ciState: 'PASSING',
  }), ['READY_TO_MERGE_CANDIDATE']);
});

test('returns no action reasons for merged or closed PRs', () => {
  assert.deepEqual(classifyActionReasons({
    authorLogin: 'me',
    currentUserLogin: 'me',
    draft: false,
    state: 'MERGED',
    reviewRequested: true,
    latestReviewState: 'CHANGES_REQUESTED',
    ciState: 'FAILING',
  }), []);

  assert.deepEqual(classifyActionReasons({
    authorLogin: 'me',
    currentUserLogin: 'me',
    draft: false,
    state: 'CLOSED',
    reviewRequested: true,
  }), []);
});

test('draft PRs do not trigger WAITING_FOR_REVIEW or READY_TO_MERGE_CANDIDATE', () => {
  const reasons = classifyActionReasons({
    authorLogin: 'me',
    currentUserLogin: 'me',
    draft: true,
    state: 'OPEN',
    reviewRequested: false,
    latestReviewState: 'APPROVED',
    ciState: 'PASSING',
  });
  assert.equal(reasons.includes('WAITING_FOR_REVIEW'), false);
  assert.equal(reasons.includes('READY_TO_MERGE_CANDIDATE'), false);
});

test('handles REVIEW_REQUESTED for reviewer regardless of authorship', () => {
  const reasons = classifyActionReasons({
    authorLogin: 'teammate',
    currentUserLogin: 'me',
    draft: false,
    state: 'OPEN',
    reviewRequested: true,
  });
  assert.deepEqual(reasons, ['REVIEW_REQUESTED']);
});
