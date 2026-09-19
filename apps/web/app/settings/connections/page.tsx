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
    <section>
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
          <a className="connect-card primary" href="http://localhost:4000/auth/github">
            <span>Recommended</span>
            <strong>Sign in with GitHub</strong>
            <p>Authorize GitHub in the browser. We use the returned access token to sync your repos and PRs.</p>
            <em>Continue with GitHub →</em>
          </a>
          <div className="connect-card">
            <span>Manual fallback</span>
            <strong>Personal Access Token</strong>
            <p>Use this if OAuth is blocked or you want to connect another GitHub account.</p>
          </div>
        </div>
      )}

      <ConnectPatForm />

      <div className="panel permissions-panel">
        <h2>Required permissions</h2>
        <p>For PATs, use read-only access where GitHub lets you choose it.</p>
        <ul>{connections.permissionChecklist.map((item: string) => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
  );
}
