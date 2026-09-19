import { notFound } from 'next/navigation';
import { PageHeader, Status } from '../../components';
import { api } from '../../lib/api';

export default async function RepositoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await api.repository(id);
  const pullRequests = await api.pullRequests();
  if (!repo) notFound();
  const repoPrs = pullRequests.data.filter(pr => pr.repo.toLowerCase() === repo.name.toLowerCase());
  return (
    <section>
      <PageHeader eyebrow={repo.relationship} title={repo.name}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
          <Status>{repo.visibility}</Status>
          <a className="button secondary" href="/repositories">
            ← Back to Repositories
          </a>
        </div>
      </PageHeader>
      <div className="panel">
        <h2>Relevant pull requests ({repoPrs.length})</h2>
        {repoPrs.length ? (
          <div className="list" style={{ marginTop: '1rem' }}>
            {repoPrs.map(pr => (
              <a className="row" href={`/pull-requests/${pr.id}`} key={pr.id}>
                <div>
                  <strong>{pr.title}</strong>
                  <small>#{pr.number} · {pr.author} · {pr.updated}</small>
                </div>
                <span>
                  <Status>{pr.state}</Status> <Status>{pr.ci}</Status>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>No synchronized pull requests found for this repository.</p>
        )}
      </div>
    </section>
  );
}
