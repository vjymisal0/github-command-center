import { notFound } from 'next/navigation';
import { PageHeader, Status } from '../../components';
import { prs } from '../../data';

export default async function PullRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pr = prs.find(item => item.id === id);
  if (!pr) notFound();
  return <section><PageHeader eyebrow={`${pr.repo} #${pr.number}`} title={pr.title}><p>Read-only detail page. Canonical GitHub links will appear here after connection setup.</p></PageHeader><div className="panel"><dl className="facts"><dt>Author</dt><dd>{pr.author}</dd><dt>State</dt><dd><Status>{pr.state}</Status></dd><dt>Checks</dt><dd><Status>{pr.ci}</Status></dd><dt>Review</dt><dd>{pr.review}</dd><dt>Action reasons</dt><dd>{pr.reasons.join(', ')}</dd></dl></div></section>;
}
