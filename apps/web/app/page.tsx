import { api } from './lib/api';

export default async function OverviewPage() {
  const overview = await api.overview();
  const cards = [
    ['Open PRs', overview.openPullRequests, '/pull-requests'],
    ['Action items', overview.actionItems, '/inbox'],
    ['Failing checks', overview.failingChecks, '/pull-requests?ci=Failing'],
  ];

  const isSynced = Boolean(overview.lastSuccessfulSync);

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
        <h2>{isSynced ? 'Synced & Active' : 'First sync required'}</h2>
        {isSynced ? (
          <>
            <p>
              Your GitHub accounts are actively connected and synchronized across{' '}
              <strong>{overview.repositories}</strong> repositories and{' '}
              <strong>{overview.openPullRequests}</strong> open pull requests.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <a className="button" href="/inbox">Go to Action Inbox</a>
              <a className="button" style={{ background: 'transparent', color: 'var(--text)' }} href="/settings/connections">Manage connections</a>
            </div>
          </>
        ) : (
          <>
            <p>Connect a fine-grained or classic GitHub PAT to discover repositories and pull requests.</p>
            <a className="button" href="/settings/connections">Set up connection</a>
          </>
        )}
      </section>
    </section>
  );
}
