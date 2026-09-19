import { PageHeader, Status } from '../components';
import { api } from '../lib/api';

export default async function PullRequestsPage() {
  const result = await api.pullRequests();
  return <section><PageHeader eyebrow="Pull requests" title="PR explorer"><div className="filters"><input placeholder="Search PRs" aria-label="Search PRs" /><select aria-label="State"><option>All states</option><option>Open</option><option>Draft</option></select><select aria-label="CI"><option>All CI</option><option>Failing</option><option>Passing</option></select></div></PageHeader><div className="list">{result.data.map(pr => <a className="row" href={`/pull-requests/${pr.id}`} key={pr.id}><div><strong>{pr.title}</strong><small>{pr.repo} #{pr.number} · {pr.author} · {pr.updated}</small></div><span><Status>{pr.state}</Status> <Status>{pr.ci}</Status></span></a>)}</div></section>;
}
