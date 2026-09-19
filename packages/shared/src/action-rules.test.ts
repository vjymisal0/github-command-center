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
