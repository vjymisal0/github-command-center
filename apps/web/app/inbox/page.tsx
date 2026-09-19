import { PageHeader, Status } from '../components';
import { prs } from '../data';

export default function InboxPage() {
  const items = prs.flatMap(pr => pr.reasons.map(reason => ({ pr, reason })));
  return <section><PageHeader eyebrow="Inbox" title="Action inbox"><p>Explainable, read-only rules. One PR can appear for multiple reasons.</p></PageHeader><div className="list">{items.map(({ pr, reason }) => <a className="row" href={`/pull-requests/${pr.id}`} key={`${pr.id}-${reason}`}><div><strong>{pr.title}</strong><small>{pr.repo} #{pr.number}</small></div><Status>{reason.replaceAll('_', ' ')}</Status></a>)}</div></section>;
}
