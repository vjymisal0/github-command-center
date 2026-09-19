import { PageHeader } from '../../components';
import { api } from '../../lib/api';
import { ConnectPatForm } from './connect-form';
import { ConnectedAccountsList } from './connected-accounts';

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const connections = await api.connections();
  const { connected } = await searchParams;

  const patConnection = connections.data.find(c => c.type.startsWith('PAT'));
  const accountItems = patConnection?.accountItems;

  return (
    <section>
      <PageHeader eyebrow="Settings" title="GitHub connections">
        <p>Connect one or multiple GitHub accounts via fine-grained PAT. All tokens are encrypted using AES-256-GCM.</p>
      </PageHeader>

      {connected && (
        <div className="panel" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          <strong>GitHub account successfully connected and synced!</strong>
        </div>
      )}

      <div className="grid">
        {connections.data.map((connection: any) => (
          <div className="card" key={connection.type}>
            <span>{connection.coverage}</span>
            <strong>{connection.type.replace('_', ' ')}</strong>
            <p style={{ margin: '0.25rem 0', fontWeight: 600 }}>{connection.status}</p>
            {connection.description && (
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: '0.25rem' }}>
                {connection.description}
              </small>
            )}
            {connection.accounts && connection.accounts.length > 0 && (
              <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--accent)' }}>
                Accounts: {connection.accounts.join(', ')}
              </small>
            )}
          </div>
        ))}
      </div>

      <ConnectedAccountsList accounts={accountItems} />

      <ConnectPatForm />

      <div className="panel">
        <h2>Permission checklist</h2>
        <p>When creating your token in GitHub Developer Settings, enable read-only permissions for:</p>
        <ul>
          {connections.permissionChecklist.map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
