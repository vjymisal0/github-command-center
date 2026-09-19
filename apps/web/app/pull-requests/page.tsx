import { PageHeader, Status } from '../components';
import { api } from '../lib/api';

export default async function PullRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; state?: string; ci?: string }>;
}) {
  const { search, state, ci } = await searchParams;
  const result = await api.pullRequests({ search, state, ci });

  return (
    <section>
      <PageHeader eyebrow="Pull requests" title="PR explorer">
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
            <option value="Draft">Draft</option>
          </select>
          <select name="ci" defaultValue={ci ?? ''} aria-label="CI status">
            <option value="">All CI</option>
            <option value="Passing">Passing</option>
            <option value="Failing">Failing</option>
            <option value="Pending">Pending</option>
          </select>
          <button className="button" type="submit">Filter</button>
          {(search || state || ci) && (
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
                <Status>{pr.state}</Status> <Status>{pr.ci}</Status>
              </span>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
