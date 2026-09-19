const cards = [
  ['Open PRs', '—'],
  ['Action items', '—'],
  ['Failing checks', '—'],
  ['Merged PRs', '—'],
];

export default function OverviewPage() {
  return (
    <section>
      <p className="eyebrow">Overview</p>
      <h1>Your GitHub work, one inbox first.</h1>
      <div className="grid">
        {cards.map(([label, value]) => (
          <a className="card" href={label === 'Action items' ? '/inbox' : '/pull-requests'} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </a>
        ))}
      </div>
      <section className="panel">
        <h2>First sync required</h2>
        <p>Connect a GitHub App or fine-grained PAT to discover repositories and pull requests.</p>
        <a className="button" href="/settings/connections">Set up connection</a>
      </section>
    </section>
  );
}
