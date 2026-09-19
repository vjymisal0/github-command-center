import { api } from './lib/api';
import { Status } from './components';
import { SyncButton } from './components/sync-button';

export default async function OverviewPage() {
  const [overview, inboxData, pullRequestsData, repositoriesData] = await Promise.all([
    api.overview(),
    api.inbox(),
    api.pullRequests(),
    api.repositories(),
  ]);

  const openPRs = overview.openPullRequests;
  const failingChecks = overview.failingChecks;
  const totalRepos = overview.repositories;
  
  // Real merged PR count from overview or PR data
  const mergedPRs = overview.mergedPullRequests ?? pullRequestsData.data.filter(
    pr => pr.state.toLowerCase() === 'merged' || pr.state.toLowerCase() === 'closed'
  ).length;

  // Real data for Attention List: Top PRs requiring action
  const attentionItems = inboxData.data.slice(0, 5);

  // Real data for Top Repositories: sorted by active PR count
  const topRepos = [...repositoriesData.data]
    .sort((a, b) => b.prs - a.prs)
    .slice(0, 6);
  
  const maxRepoPrs = Math.max(1, ...topRepos.map(r => r.prs));

  return (
    <section>
      {/* Overview Heading Area with Subtitle & Sync Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <p className="eyebrow" style={{ margin: 0, marginBottom: '0.35rem' }}>Overview</p>
          <h1 style={{ margin: 0, marginBottom: '0.35rem' }}>Your GitHub work, simplified.</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
            Track your pull requests, review requests, and repositories across accounts in one place.
          </p>
        </div>

        <SyncButton initialLastSync={overview.lastSuccessfulSync} />
      </div>

      {/* 4 Colorful Dashboard Metric Cards */}
      <div className="grid">
        {/* 1. Open PRs */}
        <a
          className="metric-card"
          href="/pull-requests?state=Open"
          style={{ borderTop: '3px solid #2563eb' }}
        >
          <div>
            <div className="metric-header">
              <span className="metric-label">Open PRs</span>
              <div
                className="metric-icon-box"
                style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  borderColor: 'rgba(37, 99, 235, 0.25)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                  <line x1="6" y1="9" x2="6" y2="21" />
                </svg>
              </div>
            </div>
            <div className="metric-value" style={{ color: '#2563eb' }}>{openPRs}</div>
          </div>
          <p className="metric-description">Active pull requests across your connected repositories</p>
        </a>

        {/* 2. Merged PRs */}
        <a
          className="metric-card"
          href="/pull-requests?state=Merged"
          style={{ borderTop: '3px solid #059669' }}
        >
          <div>
            <div className="metric-header">
              <span className="metric-label">Merged PRs</span>
              <div
                className="metric-icon-box"
                style={{
                  background: 'rgba(5, 150, 105, 0.12)',
                  color: '#059669',
                  borderColor: 'rgba(5, 150, 105, 0.25)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M6 21V9a9 9 0 0 0 9 9" />
                </svg>
              </div>
            </div>
            <div className="metric-value" style={{ color: '#059669' }}>{mergedPRs}</div>
          </div>
          <p className="metric-description">Shipped &amp; merged open-source contributions</p>
        </a>

        {/* 3. Failing Checks */}
        <a
          className="metric-card"
          href="/pull-requests?ci=Failing"
          style={{ borderTop: '3px solid #dc2626' }}
        >
          <div>
            <div className="metric-header">
              <span className="metric-label">Failing Checks</span>
              <div
                className="metric-icon-box"
                style={{
                  background: 'rgba(220, 38, 38, 0.1)',
                  color: '#dc2626',
                  borderColor: 'rgba(220, 38, 38, 0.25)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
            <div className="metric-value" style={{ color: '#dc2626' }}>{failingChecks}</div>
          </div>
          <p className="metric-description">PRs with failing continuous integration or checks</p>
        </a>

        {/* 4. Repositories */}
        <a
          className="metric-card"
          href="/repositories"
          style={{ borderTop: '3px solid #7c3aed' }}
        >
          <div>
            <div className="metric-header">
              <span className="metric-label">Repositories</span>
              <div
                className="metric-icon-box"
                style={{
                  background: 'rgba(124, 58, 237, 0.1)',
                  color: '#7c3aed',
                  borderColor: 'rgba(124, 58, 237, 0.25)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              </div>
            </div>
            <div className="metric-value" style={{ color: '#7c3aed' }}>{totalRepos}</div>
          </div>
          <p className="metric-description">Accessible owned &amp; contributed repositories</p>
        </a>
      </div>

      {/* Needs Your Attention Section */}
      <div className="panel" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>Needs Your Attention</h2>
            <small style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>High-priority pull requests requiring review or updates</small>
          </div>
          <a href="/pull-requests" style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            View all PRs →
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {attentionItems.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
              All clear! No pull requests require immediate attention.
            </div>
          ) : (
            attentionItems.map(({ id, pullRequest: pr, reason: r }) => (
              <a className="attention-row" href={`/pull-requests/${pr.id}`} key={id}>
                <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {pr.repo} #{pr.number}
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pr.title}
                  </strong>
                  <small style={{ color: 'var(--muted-soft)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                    Updated {pr.updated}
                  </small>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <Status>{r.replaceAll('_', ' ')}</Status>
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* Top Repositories by Activity */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>Top Repositories by Activity</h2>
            <small style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Most active open-source and owned repositories</small>
          </div>
          <a href="/repositories" style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            View all →
          </a>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="repo-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>Repository</th>
                <th>Relationship</th>
                <th style={{ minWidth: '160px' }}>Activity</th>
                <th style={{ textAlign: 'right' }}>Open PRs</th>
              </tr>
            </thead>
            <tbody>
              {topRepos.map(repo => {
                const percent = Math.min(100, Math.round((repo.prs / maxRepoPrs) * 100));
                return (
                  <tr key={repo.id}>
                    <td>
                      <a
                        href={`/repositories/${repo.id}`}
                        style={{ textDecoration: 'none', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2563eb',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                            <path d="M6 6h10" />
                            <path d="M6 10h10" />
                          </svg>
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.875rem' }}>{repo.name}</strong>
                          <small style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                            {repo.visibility} · Synced {repo.synced}
                          </small>
                        </div>
                      </a>
                    </td>
                    <td>
                      <Status>{repo.relationship}</Status>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div className="activity-bar-bg" style={{ flex: 1, background: 'var(--line)', borderRadius: '999px', height: '6px' }}>
                          <div
                            style={{
                              width: `${Math.max(10, percent)}%`,
                              height: '100%',
                              borderRadius: '999px',
                              background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                            }}
                          />
                        </div>
                        <small style={{ color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          {repo.prs} PR{repo.prs !== 1 ? 's' : ''}
                        </small>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {repo.prs}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
