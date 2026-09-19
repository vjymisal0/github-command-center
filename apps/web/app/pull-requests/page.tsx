import { PageHeader, Status } from '../components';
import { api } from '../lib/api';

export default async function PullRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string }>;
}) {
  const { search, state } = await searchParams;
  const result = await api.pullRequests({ search, state });

  return (
    <section>
      <PageHeader eyebrow="PRs" title="PRs">
        <form className="filters" method="get">
          <input
            name="search"
            defaultValue={search ?? ''}
            placeholder="Search PRs by title, author, repo..."
            aria-label="Search PRs"
          />
          <select name="state" defaultValue={state ?? ''} aria-label="State">
            <option value="">All states</option>
            <option value="Open">Open</option>
            <option value="Merged">Merged</option>
            <option value="Draft">Draft</option>
            <option value="Closed">Closed</option>
          </select>
          <button className="button" type="submit">Filter</button>
          {(search || state) && (
            <a className="button" style={{ background: 'transparent', color: 'var(--text)' }} href="/pull-requests">
              Clear
            </a>
          )}
        </form>
      </PageHeader>

      <div className="list">
        {result.data.length === 0 ? (
          <div className="panel">
            <p>No matching pull requests found.</p>
          </div>
        ) : (
          result.data.map(pr => (
            <a className="row" href={`/pull-requests/${pr.id}`} key={pr.id}>
              <div>
                <strong>{pr.title}</strong>
                <small>{pr.repo} #{pr.number} · {pr.author} · {pr.updated}</small>
              </div>
              <span>
                <Status>{pr.state}</Status>
              </span>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
