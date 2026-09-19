export const prs = [
  { id: 'pr_1', repo: 'vjymisal0/github-command-center', number: 12, title: 'Add repository sync worker', author: 'vjymisal0', state: 'Open', ci: 'Passing', review: 'Review requested', reasons: ['REVIEW_REQUESTED'], updated: '5m ago' },
  { id: 'pr_2', repo: 'formbricks/formbricks', number: 9182, title: 'Fix OAuth callback origin validation', author: 'contributor', state: 'Open', ci: 'Failing', review: 'Changes requested', reasons: ['CHANGES_REQUESTED', 'CI_FAILED'], updated: '2h ago' },
  { id: 'pr_3', repo: 'unkeyed/unkey', number: 4431, title: 'Document PAT fallback coverage', author: 'vjymisal0', state: 'Draft', ci: 'Unknown', review: 'Waiting', reasons: ['WAITING_FOR_REVIEW'], updated: '1d ago' },
] as const;

export const repos = [
  { id: 'repo_1', name: 'vjymisal0/github-command-center', relationship: 'Owned', visibility: 'Public', prs: 1, synced: 'just now' },
  { id: 'repo_2', name: 'formbricks/formbricks', relationship: 'External contribution', visibility: 'Public', prs: 1, synced: '2h ago' },
  { id: 'repo_3', name: 'private-org/internal-tool', relationship: 'Collaborating', visibility: 'Private', prs: 4, synced: 'stale' },
] as const;
