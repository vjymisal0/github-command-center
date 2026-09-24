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
          <p>{hasAccounts ? 'Sync active.' : 'Connect a read-only token.'}</p>
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
            <strong>Fine-grained token</strong>
            <p>Select repositories and read-only access.</p>
            <em>Encrypted at rest.</em>
          </div>
        </div>
      )}

      {!hasAccounts && <ConnectPatForm />}

      <details className="panel permissions-panel">
        <summary>Token permission checklist</summary>
        <p>Use read-only permissions.</p>
        <ul>{connections.permissionChecklist.map((item: string) => <li key={item}>{item}</li>)}</ul>
      </details>
    </section>
  );
}
