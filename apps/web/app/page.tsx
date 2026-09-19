import { api } from './lib/api';

export default async function OverviewPage() {
  const overview = await api.overview();
  const cards = [
    ['Open PRs', overview.openPullRequests, '/pull-requests'],
    ['Action items', overview.actionItems, '/inbox'],
    ['Failing checks', overview.failingChecks, '/pull-requests'],
    ['Repositories', overview.repositories, '/repositories'],
  ];
  return (
    <section>
      <p className="eyebrow">Overview</p>
      <h1>Your GitHub work, one inbox first.</h1>
      <div className="grid">
        {cards.map(([label, value, href]) => (
          <a className="card" href={String(href)} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </a>
        ))}
      </div>
      <section className="panel">
        <h2>{overview.lastSuccessfulSync ? 'Synced' : 'First sync required'}</h2>
        <p>Connect a GitHub App or fine-grained PAT to discover repositories and pull requests.</p>
        <a className="button" href="/settings/connections">Set up connection</a>
      </section>
    </section>
  );
}
