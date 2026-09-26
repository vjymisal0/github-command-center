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
  const githubConnection = connections.data.find(c => c.type === 'GitHub account');
  const accounts = githubConnection?.accountItems ?? [];
  const hasAccounts = accounts.length > 0;

  return (
    <section className="access-page">
      <div className="access-hero">
        <PageHeader eyebrow="Settings" title="GitHub access">
          <p>{hasAccounts ? 'Sync active.' : 'Sign in with GitHub to connect data.'}</p>
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
          <div className="connect-card primary">
            <span>Recommended</span>
            <strong>GitHub sign-in</strong>
            <p>Authorizes identity and public GitHub activity only.</p>
            <em>Token encrypted at rest.</em>
          </div>
        </div>
      )}

      {!hasAccounts && (
        <div className="panel login">
          <h2>Connect with GitHub</h2>
          <p>Sign in once to create your account and start sync.</p>
          <a className="button github-auth" href="/api/auth/github">Continue with GitHub</a>
        </div>
      )}

      {!hasAccounts && (
        <details className="panel permissions-panel">
          <summary>Personal access token fallback</summary>
          <ConnectPatForm />
        </details>
      )}

      <details className="panel permissions-panel">
        <summary>GitHub permission checklist</summary>
        <p>OAuth asks only for identity and email. Use PAT fallback only if you need private repository sync.</p>
        <ul>{connections.permissionChecklist.map((item: string) => <li key={item}>{item}</li>)}</ul>
      </details>
    </section>
  );
}
