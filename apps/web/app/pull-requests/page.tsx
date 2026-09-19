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
      <PageHeader eyebrow="Your contributions" title="Pull requests">
        <p>Browse synchronized pull requests across your connected accounts.</p>
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
            <a className="button secondary" href="/pull-requests">
              Clear
            </a>
          )}
        </form>
      </PageHeader>

      <p className="results-count">{result.total} matching pull requests</p>
      <div className="list">
        {result.data.length === 0 ? (
          <div className="panel">
            <h2>{result.coverage === 'not_connected' ? 'Connect GitHub to get started' : 'No matching pull requests'}</h2>
            <p>{result.coverage === 'not_connected' ? 'Your pull requests will appear here after your first sync.' : 'Try another search or clear the selected filters.'}</p>
            <a className="button secondary" href={result.coverage === 'not_connected' ? '/settings/connections' : '/pull-requests'}>{result.coverage === 'not_connected' ? 'Connect GitHub' : 'Clear filters'}</a>
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
