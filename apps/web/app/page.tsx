import { api } from './lib/api';
import { SyncButton } from './components/sync-button';

export default async function OverviewPage() {
  const overview = await api.overview();
  const connected = overview.coverage !== 'not_connected';
  const cards = [
    ['Open PRs', overview.openPullRequests, '/pull-requests?state=Open', '↗'],
    ['Merged PRs', overview.mergedPullRequests ?? 0, '/pull-requests?state=Merged', '✓'],
    ['Action items', overview.actionItems, '/pull-requests', '!'],
    ['Repositories', overview.repositories, '/repositories', '#'],
  ];
  const total = Math.max(1, overview.openPullRequests + (overview.mergedPullRequests ?? 0) + overview.actionItems);
  const openPct = Math.round((overview.openPullRequests / total) * 100);
  const mergedPct = Math.round(((overview.mergedPullRequests ?? 0) / total) * 100);

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
          <h2>Workload mix</h2>
          <p>{connected ? 'A compact split of your current GitHub work.' : 'Connect GitHub and this becomes a live workload chart.'}</p>
        </div>
        <div className="donut-wrap" aria-label="Workload mix chart">
          <div
            className="donut"
            style={{
              background: `conic-gradient(#2563eb 0 ${openPct}%, #16a34a ${openPct}% ${openPct + mergedPct}%, #f97316 ${openPct + mergedPct}% 100%)`,
            }}
          >
            <span>{connected ? total : 0}<small>total</small></span>
          </div>
          <div className="donut-legend">
            <span><i style={{ background: '#2563eb' }} /> Open</span>
            <span><i style={{ background: '#16a34a' }} /> Merged</span>
            <span><i style={{ background: '#f97316' }} /> Action</span>
          </div>
        </div>
      </div>
    </section>
  );
}
