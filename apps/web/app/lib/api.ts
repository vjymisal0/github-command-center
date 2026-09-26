import { cookies, headers } from 'next/headers';

async function apiBase() {
  if (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL) return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL!;
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? '127.0.0.1:3000';
  return `${proto}://${host}/api`;
}

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
    const cookieHeader = (await cookies()).toString();
    const res = await fetch(`${await apiBase()}${path}`, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    if (!res.ok) return fallback;
    return await res.json() as T;
  } catch {
    return fallback;
  }
}

const emptyOverview: OverviewStats = {
  openPullRequests: 0,
  mergedPullRequests: 0,
  actionItems: 0,
  failingChecks: 0,
  repositories: 0,
  lastSuccessfulSync: null,
  coverage: 'not_connected',
};

export const api = {
  me: () => get<{ user: { id: string; email: string; name: string | null } | null }>('/auth/me', { user: null }),
  overview: () => get<OverviewStats>('/analytics/overview', emptyOverview),
  inbox: () => get<{ total: number; data: InboxItem[]; coverage: string }>('/inbox', { total: 0, data: [], coverage: 'not_connected' }),
  pullRequests: (query?: { search?: string; state?: string; ci?: string }) => {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.state) params.set('state', query.state);
    if (query?.ci) params.set('ci', query.ci);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return get<{ total: number; data: PRRecord[]; coverage: string }>(`/pull-requests${qs}`, { total: 0, data: [], coverage: 'not_connected' });
  },
  pullRequest: (id: string) => get<PRRecord | null>(`/pull-requests/${id}`, null),
  pullRequestDescription: (id: string) => get<{ id: string; description: string }>(`/pull-requests/${id}/description`, { id, description: 'No description provided.' }),
  repositories: (query?: { search?: string; visibility?: string; relationship?: string }) => {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.visibility) params.set('visibility', query.visibility);
    if (query?.relationship) params.set('relationship', query.relationship);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return get<{ total: number; data: RepoRecord[]; coverage: string }>(`/repositories${qs}`, { total: 0, data: [], coverage: 'not_connected' });
  },
  repository: (id: string) => get<RepoRecord | null>(`/repositories/${id}`, null),
  connections: () => get<ConnectionsResponse>('/connections', { data: [], permissionChecklist: [] }),
};
