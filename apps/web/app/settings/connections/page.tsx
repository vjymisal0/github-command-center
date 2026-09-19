import { PageHeader } from '../../components';
import { api } from '../../lib/api';
import { ConnectPatForm } from './connect-form';
import { ConnectedAccountsList } from './connected-accounts';

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; disconnected?: string }>;
}) {
  const connections = await api.connections();
  const { connected, disconnected } = await searchParams;
  const patConnection = connections.data.find(c => c.type.startsWith('PAT'));
  const accounts = patConnection?.accountItems ?? [];
  const hasAccounts = accounts.length > 0;

  return (
    <section className="access-page">
      <div className="access-hero">
        <PageHeader eyebrow="Settings" title="GitHub access">
          <p>{hasAccounts ? 'GitHub is connected. Synced repositories and pull requests are live.' : 'No GitHub account is connected. Choose GitHub sign-in or paste a read-only token to start syncing.'}</p>
        </PageHeader>
        <div className={hasAccounts ? 'connection-pill connected' : 'connection-pill'}>
          <span /> {hasAccounts ? `${accounts.length} connected` : 'Not connected'}
        </div>
      </div>

      {connected && <div className="notice success"><strong>GitHub account connected and synced.</strong></div>}
      {disconnected && <div className="notice danger"><strong>GitHub account disconnected.</strong></div>}

      <ConnectedAccountsList accounts={accounts} />

      {!hasAccounts && (
        <div className="connect-grid">
          <a className="connect-card primary" href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000'}/auth/github`}>
            <span>Browser authorization</span>
            <strong>Sign in with GitHub</strong>
            <p>Continue to GitHub to review access. OAuth requests broad repository permissions; use a fine-grained PAT for narrower access.</p>
            <em>Continue with GitHub →</em>
          </a>
          <div className="connect-card">
            <span>Manual fallback</span>
            <strong>Personal Access Token</strong>
            <p>Choose selected repositories and read-only permissions in GitHub, then enter your token below.</p>
          </div>
        </div>
      )}

      <ConnectPatForm />

      <details className="panel permissions-panel">
        <summary>Token permission checklist</summary>
        <p>For PATs, use read-only access where GitHub lets you choose it.</p>
        <ul>{connections.permissionChecklist.map((item: string) => <li key={item}>{item}</li>)}</ul>
      </details>
    </section>
  );
}
