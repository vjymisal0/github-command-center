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
      <PageHeader eyebrow="Settings" title="GitHub connection">
        <p>{hasAccounts ? 'GitHub is connected. Synced repositories and pull requests are now shown in the dashboard.' : 'No GitHub account is connected yet. Connect with a Personal Access Token now, or configure GitHub OAuth/App sign-in later.'}</p>
      </PageHeader>

      {connected && <div className="notice success"><strong>GitHub account connected and synced.</strong></div>}
      {disconnected && <div className="notice danger"><strong>GitHub account disconnected.</strong></div>}

      <ConnectedAccountsList accounts={accounts} />

      {!hasAccounts && (
        <div className="grid" style={{ marginTop: '1.5rem' }}>
          <div className="card">
            <span>Available now</span>
            <strong>Personal Access Token</strong>
            <p>Paste a read-only GitHub token below. The API validates it, encrypts it, and starts the first sync.</p>
          </div>
          <div className="card muted-card">
            <span>Not configured</span>
            <strong>Sign in with GitHub</strong>
            <p>Needs a GitHub OAuth/App client ID, secret, callback URL, and webhook secret. Use PAT until those env vars exist.</p>
          </div>
        </div>
      )}

      <ConnectPatForm />

      <div className="panel">
        <h2>Required token permissions</h2>
        <ul>{connections.permissionChecklist.map((item: string) => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
  );
}
