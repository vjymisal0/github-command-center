import { prs, repos } from '../data';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface OverviewStats {
  openPullRequests: number;
  mergedPullRequests?: number;
  actionItems: number;
  failingChecks: number;
  repositories: number;
  lastSuccessfulSync: string | null;
  coverage: string;
}

export interface PRRecord {
  id: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  state: string;
  ci: string;
  review: string;
  reasons: readonly string[] | string[];
  updated: string;
  htmlUrl?: string;
  description?: string;
}

export interface RepoRecord {
  id: string;
  name: string;
  relationship: string;
  visibility: string;
  prs: number;
  synced: string;
}

export interface InboxItem {
  id: string;
  reason: string;
  pullRequest: PRRecord;
}

export interface ConnectionsResponse {
  data: Array<{
    type: string;
    status: string;
    coverage: string;
    description?: string;
    webhook: boolean;
    accounts?: string[];
    accountItems?: Array<{ id: string; username: string }>;
  }>;
  permissionChecklist: string[];
}

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
  overview: () => get<OverviewStats>('/analytics/overview', {
    openPullRequests: prs.filter(pr => pr.state === 'Open').length,
    mergedPullRequests: (prs as readonly { state: string }[]).filter(pr => pr.state === 'Merged' || pr.state === 'Closed').length,
    actionItems: prs.reduce((sum, pr) => sum + pr.reasons.length, 0),
    failingChecks: prs.filter(pr => pr.ci === 'Failing').length,
    repositories: repos.length,
    lastSuccessfulSync: null,
    coverage: 'fixture',
  }),
  inbox: () => get<{ total: number; data: InboxItem[]; coverage: string }>('/inbox', {
    total: prs.reduce((sum, pr) => sum + pr.reasons.length, 0),
    data: prs.flatMap(pr => pr.reasons.map(reason => ({ id: `${pr.id}-${reason}`, reason, pullRequest: pr }))),
    coverage: 'fallback',
  }),
  pullRequests: (query?: { search?: string; state?: string; ci?: string }) => {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.state) params.set('state', query.state);
    if (query?.ci) params.set('ci', query.ci);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return get<{ total: number; data: PRRecord[]; coverage: string }>(`/pull-requests${qs}`, {
      total: prs.length,
      data: [...prs],
      coverage: 'fallback',
    });
  },
  pullRequest: (id: string) => get<PRRecord | null>(`/pull-requests/${id}`, (prs.find(pr => pr.id === id) as PRRecord) ?? null),
  pullRequestDescription: (id: string) => get<{ id: string; description: string }>(`/pull-requests/${id}/description`, {
    id,
    description: (prs.find(pr => pr.id === id) as any)?.description || 'No description provided.',
  }),
  repositories: (query?: { search?: string; visibility?: string; relationship?: string }) => {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.visibility) params.set('visibility', query.visibility);
    if (query?.relationship) params.set('relationship', query.relationship);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return get<{ total: number; data: RepoRecord[]; coverage: string }>(`/repositories${qs}`, {
      total: repos.length,
      data: [...repos],
      coverage: 'fallback',
    });
  },
  repository: (id: string) => get<RepoRecord | null>(`/repositories/${id}`, (repos.find(repo => repo.id === id) as RepoRecord) ?? null),
  connections: () => get<ConnectionsResponse>('/connections', { data: [], permissionChecklist: [] }),
};
