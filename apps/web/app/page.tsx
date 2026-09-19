import { api } from './lib/api';
import { SyncButton } from './components/sync-button';

export default async function OverviewPage() {
  const overview = await api.overview();
  const connected = overview.coverage !== 'not_connected';
  const cards = [
    ['Open PRs', overview.openPullRequests, '/pull-requests?state=Open'],
    ['Merged PRs', overview.mergedPullRequests ?? 0, '/pull-requests?state=Merged'],
    ['Action items', overview.actionItems, '/pull-requests'],
    ['Repositories', overview.repositories, '/repositories'],
  ];

  return (
    <section>
      <div className="simple-hero">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>GitHub work dashboard</h1>
          <p>Connect GitHub to see your live pull requests, reviews, and repositories.</p>
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
        {cards.map(([label, value, href]) => (
          <a className="metric-card simple" href={String(href)} key={String(label)}>
            <span className="metric-label">{label}</span>
            <strong className="metric-value">{value}</strong>
          </a>
        ))}
      </div>
    </section>
  );
}
