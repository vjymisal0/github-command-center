import { notFound } from 'next/navigation';
import { PageHeader, Status } from '../../components';
import { api } from '../../lib/api';
import { PrDescriptionViewer } from './description-viewer';

export default async function PullRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pr = await api.pullRequest(id);

  if (!pr) notFound();

  const githubUrl = pr.htmlUrl || `https://github.com/${pr.repo}/pull/${pr.number}`;

  return (
    <section>
      <PageHeader eyebrow={`${pr.repo} #${pr.number}`} title={pr.title}>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a
            className="button"
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on GitHub ↗
          </a>
          <a className="button secondary" href="/pull-requests">
            ← Back to PRs
          </a>
        </div>
      </PageHeader>

      <div className="panel">
        <h2>Pull request status &amp; facts</h2>
        <dl className="facts">
          <dt>Author</dt>
          <dd>@{pr.author}</dd>

          <dt>Repository</dt>
          <dd>
            <a className="external-link" href={`https://github.com/${pr.repo}`} target="_blank" rel="noopener noreferrer">
              {pr.repo}
            </a>
          </dd>

          <dt>State</dt>
          <dd>
            <Status>{pr.state}</Status>
          </dd>

          <dt>CI Checks</dt>
          <dd>
            <Status>{pr.ci}</Status>
          </dd>

          <dt>Review status</dt>
          <dd>
            <Status>{pr.review}</Status>
          </dd>

          <dt>Action triggers</dt>
          <dd>
            {pr.reasons && pr.reasons.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {pr.reasons.map(r => (
                  <Status key={r}>{r.replaceAll('_', ' ')}</Status>
                ))}
              </div>
            ) : (
              <span>No pending actions</span>
            )}
          </dd>

          <dt>Last activity</dt>
          <dd>{pr.updated}</dd>
        </dl>
      </div>

      <PrDescriptionViewer prId={pr.id} />
    </section>
  );
}
