import { notFound } from 'next/navigation';
import { PageHeader, Status } from '../../components';
import { api } from '../../lib/api';

export default async function RepositoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await api.repository(id);
  const pullRequests = await api.pullRequests();
  if (!repo) notFound();
  const repoPrs = pullRequests.data.filter(pr => pr.repo === repo.name);
  return <section><PageHeader eyebrow={repo.relationship} title={repo.name}><Status>{repo.visibility}</Status></PageHeader><div className="panel"><h2>Relevant pull requests</h2>{repoPrs.length ? repoPrs.map(pr => <p key={pr.id}>{pr.title}</p>) : <p>No synchronized PRs yet.</p>}</div></section>;
}
