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
export type ActionReason = 'REVIEW_REQUESTED' | 'CHANGES_REQUESTED' | 'CI_FAILED' | 'UNRESOLVED_DISCUSSION' | 'WAITING_FOR_REVIEW' | 'READY_TO_MERGE_CANDIDATE';
export declare function classifyActionReasons(pr: PullRequestFacts): ActionReason[];
