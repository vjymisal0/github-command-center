import { prs, repos } from '../data';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${apiBase}${path}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return await res.json() as T;
  } catch {
    return fallback;
  }
}

export const api = {
  overview: () => get('/analytics/overview', {
    openPullRequests: prs.filter(pr => pr.state === 'Open').length,
    actionItems: prs.reduce((sum, pr) => sum + pr.reasons.length, 0),
    failingChecks: prs.filter(pr => pr.ci === 'Failing').length,
    repositories: repos.length,
    lastSuccessfulSync: null,
    coverage: 'fixture',
  }),
  inbox: () => get('/inbox', { total: 0, data: prs.flatMap(pr => pr.reasons.map(reason => ({ id: `${pr.id}-${reason}`, reason, pullRequest: pr }))), coverage: 'fallback' }),
  pullRequests: () => get('/pull-requests', { total: prs.length, data: prs, coverage: 'fallback' }),
  pullRequest: (id: string) => get(`/pull-requests/${id}`, prs.find(pr => pr.id === id) ?? null),
  repositories: () => get('/repositories', { total: repos.length, data: repos, coverage: 'fallback' }),
  repository: (id: string) => get(`/repositories/${id}`, repos.find(repo => repo.id === id) ?? null),
  connections: () => get('/connections', { data: [], permissionChecklist: [] }),
};
