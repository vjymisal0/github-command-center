import { api } from './lib/api';
import { Status } from './components';
import { SyncButton } from './components/sync-button';

export default async function OverviewPage() {
  const [overview, inboxData, pullRequestsData] = await Promise.all([
    api.overview(),
    api.inbox(),
    api.pullRequests(),
  ]);

  const openPRs = overview.openPullRequests;
  const actionItems = overview.actionItems;
  const failingChecks = overview.failingChecks;
  
  // Real merged PR count from overview or PR data
  const mergedPRs = overview.mergedPullRequests ?? pullRequestsData.data.filter(
    pr => pr.state.toLowerCase() === 'merged' || pr.state.toLowerCase() === 'closed'
  ).length;

  // Real data for Attention List: Top PRs requiring action
  const attentionItems = inboxData.data.slice(0, 8);

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
            Track your pull requests, review requests, and contributions across accounts in one place.
          </p>
        </div>

        <SyncButton initialLastSync={overview.lastSuccessfulSync} />
      </div>

      {/* 4 Dashboard Metric Cards */}
      <div className="grid">
        {/* 1. Open PRs */}
        <a className="metric-card" href="/pull-requests?state=Open">
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
        <a className="metric-card" href="/pull-requests?state=Merged">
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

        {/* 3. Action Required */}
        <a className="metric-card" href="/pull-requests">
          <div>
            <div className="metric-header">
              <span className="metric-label">Action Required</span>
              <div
                className="metric-icon-box"
                style={{
                  background: 'rgba(124, 58, 237, 0.1)',
                  color: '#7c3aed',
                  borderColor: 'rgba(124, 58, 237, 0.25)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
            </div>
            <div className="metric-value" style={{ color: '#7c3aed' }}>{actionItems}</div>
          </div>
          <p className="metric-description">Pull requests waiting for your review or requested changes</p>
        </a>

        {/* 4. Failing Checks */}
        <a className="metric-card" href="/pull-requests?ci=Failing">
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
      </div>

      {/* Needs Your Attention Section */}
      <div className="panel">
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
    </section>
  );
}
