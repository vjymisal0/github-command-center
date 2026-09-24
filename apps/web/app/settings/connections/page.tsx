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
          <div className="connect-card primary">
            <span>Recommended connection</span>
            <strong>Fine-grained Personal Access Token</strong>
            <p>Choose only the repositories you want tracked and grant read-only permissions, then enter the token below.</p>
            <em>Your token is encrypted at rest.</em>
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
