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
          <span>⌁</span>
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
