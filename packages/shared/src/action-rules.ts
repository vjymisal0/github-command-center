export type PullRequestFacts = {
  authorLogin: string;
  currentUserLogin: string;
  draft: boolean;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  reviewRequested: boolean;
  latestReviewState?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'UNKNOWN';
  ciState?: 'PASSING' | 'FAILING' | 'UNKNOWN';
  unresolvedThreads?: boolean;
};

export type ActionReason =
  | 'REVIEW_REQUESTED'
  | 'CHANGES_REQUESTED'
  | 'CI_FAILED'
  | 'UNRESOLVED_DISCUSSION'
  | 'WAITING_FOR_REVIEW'
  | 'READY_TO_MERGE_CANDIDATE';

export function classifyActionReasons(pr: PullRequestFacts): ActionReason[] {
  if (pr.state !== 'OPEN') return [];

  const reasons: ActionReason[] = [];
  const mine = pr.authorLogin === pr.currentUserLogin;

  if (pr.reviewRequested) reasons.push('REVIEW_REQUESTED');
  if (mine && pr.latestReviewState === 'CHANGES_REQUESTED') reasons.push('CHANGES_REQUESTED');
  if (pr.ciState === 'FAILING') reasons.push('CI_FAILED');
  if (pr.unresolvedThreads) reasons.push('UNRESOLVED_DISCUSSION');
  if (mine && !pr.draft && pr.latestReviewState !== 'APPROVED') reasons.push('WAITING_FOR_REVIEW');
  if (!pr.draft && pr.latestReviewState === 'APPROVED' && pr.ciState === 'PASSING') reasons.push('READY_TO_MERGE_CANDIDATE');

  return reasons;
}
