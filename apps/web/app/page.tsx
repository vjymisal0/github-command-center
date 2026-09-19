import { api } from './lib/api';
import { Status } from './components';
import { SyncButton } from './components/sync-button';
import { PrActivityChart } from './components/pr-activity-chart';

export default async function OverviewPage() {
  const [overview, inboxData, pullRequestsData, repositoriesData] = await Promise.all([
    api.overview(),
    api.inbox(),
    api.pullRequests(),
    api.repositories(),
  ]);

  const openPRs = overview.openPullRequests;
  const actionItems = overview.actionItems;
  const failingChecks = overview.failingChecks;
  
  // Real merged PR count from overview or PR data
  const mergedPRs = overview.mergedPullRequests ?? pullRequestsData.data.filter(
    pr => pr.state.toLowerCase() === 'merged' || pr.state.toLowerCase() === 'closed'
  ).length;

  // Real data for Attention List: Top PRs from inbox requiring action
  const attentionItems = inboxData.data.slice(0, 5);

  // Real data for Top Repositories: sorted by active PR count
  const topRepos = [...repositoriesData.data]
    .sort((a, b) => b.prs - a.prs)
    .slice(0, 5);
  
  const maxRepoPrs = Math.max(1, ...topRepos.map(r => r.prs));

  // Compute real activity distribution by date for chart
  const openedData: { [key: string]: number } = {};
  const mergedData: { [key: string]: number } = {};

  pullRequestsData.data.forEach(pr => {
    const d = pr.updated ? new Date(pr.updated) : new Date();
    const dateStr = !isNaN(d.getTime())
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Recent';
    
    if (pr.state.toLowerCase() === 'open') {
      openedData[dateStr] = (openedData[dateStr] || 0) + 1;
    } else {
      mergedData[dateStr] = (mergedData[dateStr] || 0) + 1;
    }
  });

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
          <h1 style={{ margin: 0, marginBottom: '0.35rem' }}>Your GitHub work, one inbox first.</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
            Track pull requests, reviews, and open-source contributions — all in one place.
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
              <div className="metric-icon-box">
                {/* Git Pull Request Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                  <line x1="6" y1="9" x2="6" y2="21" />
                </svg>
              </div>
            </div>
            <div className="metric-value">{openPRs}</div>
          </div>
          <p className="metric-description">Active pull requests across your connected repositories</p>
        </a>

        {/* 2. Action Items */}
        <a className="metric-card" href="/inbox">
          <div>
            <div className="metric-header">
              <span className="metric-label">Action Items</span>
              <div className="metric-icon-box">
                {/* Inbox / Message Circle Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
              </div>
            </div>
            <div className="metric-value">{actionItems}</div>
          </div>
          <p className="metric-description">Pull requests waiting for review or requested changes</p>
        </a>

        {/* 3. Failing Checks */}
        <a className="metric-card" href="/pull-requests?ci=Failing">
          <div>
            <div className="metric-header">
              <span className="metric-label">Failing Checks</span>
              <div className="metric-icon-box">
                {/* Alert Triangle Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
            <div className="metric-value">{failingChecks}</div>
          </div>
          <p className="metric-description">PRs with failing continuous integration or checks</p>
        </a>

        {/* 4. Merged PRs */}
        <a className="metric-card" href="/pull-requests?state=Merged">
          <div>
            <div className="metric-header">
              <span className="metric-label">Merged PRs</span>
              <div className="metric-icon-box">
                {/* Git Merge Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M6 21V9a9 9 0 0 0 9 9" />
                </svg>
              </div>
            </div>
            <div className="metric-value">{mergedPRs}</div>
          </div>
          <p className="metric-description">Successfully shipped &amp; merged open-source contributions</p>
        </a>
      </div>

      {/* Main Content: Two Columns */}
      <div className="dashboard-columns">
        {/* Left Column — Pull Request Activity Chart */}
        <div>
          <PrActivityChart openedData={openedData} mergedData={mergedData} />
        </div>

        {/* Right Column — Needs Your Attention */}
        <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>Needs Your Attention</h2>
              <small style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>High-priority pull requests requiring action</small>
            </div>
            <a href="/inbox" style={{ color: 'var(--pink-accent)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
      </div>

      {/* Bottom Section — Top Repositories by Activity */}
      <div className="panel" style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>Top Repositories by Activity</h2>
            <small style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Most active open-source and owned repositories</small>
          </div>
          <a href="/repositories" style={{ color: 'var(--pink-accent)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            View all →
          </a>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="repo-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>Repository</th>
                <th>Relationship</th>
                <th style={{ minWidth: '150px' }}>Activity</th>
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
                            background: 'var(--surface-soft)',
                            border: '1px solid var(--line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--muted)',
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
                        <div className="activity-bar-bg">
                          <div className="activity-bar-fill" style={{ width: `${Math.max(10, percent)}%` }} />
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
