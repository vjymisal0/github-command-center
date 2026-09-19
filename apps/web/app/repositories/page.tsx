import { PageHeader, Status } from '../components';
import { repos } from '../data';

export default function RepositoriesPage() {
  return <section><PageHeader eyebrow="Repositories" title="Repository explorer"><div className="filters"><input placeholder="Search repositories" aria-label="Search repositories" /><select aria-label="Relationship"><option>All relationships</option><option>Owned</option><option>Collaborating</option><option>External contribution</option></select></div></PageHeader><div className="list">{repos.map(repo => <a className="row" href={`/repositories/${repo.id}`} key={repo.id}><div><strong>{repo.name}</strong><small>{repo.relationship} · {repo.prs} relevant PRs · synced {repo.synced}</small></div><Status>{repo.visibility}</Status></a>)}</div></section>;
}
