import { PageHeader, Status } from '../components';
import { api } from '../lib/api';

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const inbox = await api.inbox();

  // Distinct reason buckets
  const allReasons = Array.from(new Set(inbox.data.map(item => item.reason)));

  const filteredItems = reason
    ? inbox.data.filter(item => item.reason.toLowerCase() === reason.toLowerCase())
    : inbox.data;

  return (
    <section>
      <PageHeader eyebrow="Inbox" title="Action inbox">
        <p>Pull requests that need attention.</p>

        {allReasons.length > 0 && (
          <div className="filters" style={{ marginTop: '1rem' }}>
            <a
              className={`filter-chip ${!reason ? 'active' : ''}`}
              href="/inbox"
            >
              All ({inbox.total})
            </a>
            {allReasons.map(r => (
              <a
                key={r}
                className={`filter-chip ${reason?.toLowerCase() === r.toLowerCase() ? 'active' : ''}`}
                href={`/inbox?reason=${r}`}
              >
                {r.replaceAll('_', ' ')}
              </a>
            ))}
          </div>
        )}
      </PageHeader>

      <div className="list">
        {filteredItems.length === 0 ? (
          <div className="panel">
            <p>No action items found.</p>
          </div>
        ) : (
          filteredItems.map(({ id, pullRequest: pr, reason: r }) => (
            <a className="row" href={`/pull-requests/${pr.id}`} key={id}>
              <div>
                <strong>{pr.title}</strong>
                <small>{pr.repo} #{pr.number} · @{pr.author} · {pr.updated}</small>
              </div>
              <span>
                <Status>{r.replaceAll('_', ' ')}</Status>
              </span>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
