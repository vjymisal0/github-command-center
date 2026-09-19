import { PageHeader, Status } from '../components';
import { api } from '../lib/api';

export default async function RepositoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; relationship?: string; visibility?: string }>;
}) {
  const { search, relationship, visibility } = await searchParams;
  const result = await api.repositories({ search, relationship, visibility });

  return (
    <section>
      <PageHeader eyebrow="Repositories" title="Repository explorer">
        <p>Explore all synchronized owned, collaborating, and external contribution repositories.</p>
        <form className="filters" method="get">
          <input
            name="search"
            defaultValue={search ?? ''}
            placeholder="Search repositories..."
            aria-label="Search repositories"
          />
          <select name="relationship" defaultValue={relationship ?? ''} aria-label="Relationship">
            <option value="">All relationships</option>
            <option value="Owned">Owned</option>
            <option value="Collaborating">Collaborating</option>
            <option value="External contribution">External contribution</option>
          </select>
          <select name="visibility" defaultValue={visibility ?? ''} aria-label="Visibility">
            <option value="">All visibility</option>
            <option value="Public">Public</option>
            <option value="Private">Private</option>
          </select>
          <button className="button" type="submit">Filter</button>
          {(search || relationship || visibility) && (
            <a className="button secondary" href="/repositories">
              Clear
            </a>
          )}
        </form>
      </PageHeader>

      <div className="list">
        {result.data.length === 0 ? (
          <div className="panel">
            <p>No repositories found matching your filter.</p>
          </div>
        ) : (
          result.data.map(repo => (
            <a className="row" href={`/repositories/${repo.id}`} key={repo.id}>
              <div>
                <strong>{repo.name}</strong>
                <small>{repo.relationship} · {repo.prs} relevant PRs · synced {repo.synced}</small>
              </div>
              <span>
                <Status>{repo.visibility}</Status>
              </span>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
