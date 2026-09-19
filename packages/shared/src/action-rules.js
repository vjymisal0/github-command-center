export function classifyActionReasons(pr) {
    if (pr.state !== 'OPEN')
        return [];
    const reasons = [];
    const mine = pr.authorLogin === pr.currentUserLogin;
    if (pr.reviewRequested)
        reasons.push('REVIEW_REQUESTED');
    if (mine && pr.latestReviewState === 'CHANGES_REQUESTED')
        reasons.push('CHANGES_REQUESTED');
    if (pr.ciState === 'FAILING')
        reasons.push('CI_FAILED');
    if (pr.unresolvedThreads)
        reasons.push('UNRESOLVED_DISCUSSION');
    if (mine && !pr.draft && pr.latestReviewState !== 'APPROVED')
        reasons.push('WAITING_FOR_REVIEW');
    if (!pr.draft && pr.latestReviewState === 'APPROVED' && pr.ciState === 'PASSING')
        reasons.push('READY_TO_MERGE_CANDIDATE');
    return reasons;
}
