import { PageHeader, Status } from '../components';
import { api } from '../lib/api';

export default async function InboxPage() {
  const inbox = await api.inbox();
  return <section><PageHeader eyebrow="Inbox" title="Action inbox"><p>Explainable, read-only rules. One PR can appear for multiple reasons.</p></PageHeader><div className="list">{inbox.data.map(({ id, pullRequest: pr, reason }) => <a className="row" href={`/pull-requests/${pr.id}`} key={id}><div><strong>{pr.title}</strong><small>{pr.repo} #{pr.number}</small></div><Status>{reason.replaceAll('_', ' ')}</Status></a>)}</div></section>;
}
