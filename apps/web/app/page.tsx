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
  const chart = [
    ['Open', overview.openPullRequests, '#2563eb'],
    ['Merged', overview.mergedPullRequests ?? 0, '#16a34a'],
    ['Actions', overview.actionItems, '#f97316'],
  ];
  const max = Math.max(1, ...chart.map(([, value]) => Number(value)));

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
          <h2>Pull request shape</h2>
          <p>{connected ? 'A quick read on where your GitHub work sits right now.' : 'This will populate after your first GitHub sync.'}</p>
        </div>
        <div className="mini-chart" aria-label="Pull request metrics chart">
          {chart.map(([label, value, color]) => (
            <div className="chart-row" key={String(label)}>
              <span>{label}</span>
              <div><i style={{ width: `${(Number(value) / max) * 100}%`, background: String(color) }} /></div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
