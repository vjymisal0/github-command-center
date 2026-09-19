import { api } from './lib/api';
import { SyncButton } from './components/sync-button';

export default async function OverviewPage() {
  const overview = await api.overview();
  const connected = overview.coverage !== 'not_connected';
  const cards = [
    ['Open PRs', overview.openPullRequests, '/pull-requests?state=Open', '↗'],
    ['Merged PRs', overview.mergedPullRequests ?? 0, '/pull-requests?state=Merged', '✓'],
    ['Action items', overview.actionItems, '/inbox', '!'],
    ['Repositories', overview.repositories, '/repositories', '#'],
  ];
  const total = overview.openPullRequests + (overview.mergedPullRequests ?? 0);
  const openPct = total > 0 ? (overview.openPullRequests / total) * 100 : 0;

  return (
    <section>
      <div className="overview-hero">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Command center for your GitHub work.</h1>
          <p>Connect GitHub to track pull requests, reviews, checks, and repositories without the noise.</p>
          {!connected && <a className="button hero-cta" href="/settings/connections">Connect GitHub</a>}
        </div>
        <div className="hero-orb" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" aria-label="GitHub">
            <path fill="currentColor" d="M12 .7a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.24c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.83 1.23 1.83 1.23 1.07 1.82 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.46 11.46 0 0 1 6.01 0c2.29-1.55 3.29-1.23 3.29-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .7Z" />
          </svg>
        </div>
        <SyncButton initialLastSync={overview.lastSuccessfulSync} connected={connected} />
      </div>

      {!connected && (
        <div className="notice warning connect-warning">
          <strong>GitHub is not connected.</strong>
          <span>Connect an account to enable sync and live data.</span>
          <a href="/settings/connections">Connect now</a>
        </div>
      )}

      <div className="metrics-simple">
        {cards.map(([label, value, href, icon]) => (
          <a className="metric-card simple" href={String(href)} key={String(label)}>
            <span className="metric-icon">{icon}</span>
            <span className="metric-label">{label}</span>
            <strong className="metric-value">{value}</strong>
          </a>
        ))}
      </div>

      <div className="overview-panel">
        <div>
          <p className="eyebrow">Snapshot</p>
          <h2>Open &amp; merged</h2>
          <p>{connected ? 'Reported open and merged PR counts. Drafts and closed-unmerged PRs are excluded.' : 'Your snapshot will appear after connecting GitHub and completing a sync.'}</p>
        </div>
        <div className="donut-wrap" role="img" aria-label={`Reported PR counts: ${overview.openPullRequests} open, ${overview.mergedPullRequests ?? 0} merged`}>
          <div
            className="donut"
            style={{
              background: total > 0 ? `conic-gradient(var(--chart-open) 0 ${openPct}%, var(--chart-merged) ${openPct}% 100%)` : 'var(--line)',
            }}
          >
            <span>{total}<small>{total ? 'reported PRs' : 'No data yet'}</small></span>
          </div>
          <div className="donut-legend">
            <span><i style={{ background: 'var(--chart-open)' }} /> Open <strong>{overview.openPullRequests}</strong></span>
            <span><i style={{ background: 'var(--chart-merged)' }} /> Merged <strong>{overview.mergedPullRequests ?? 0}</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
}
