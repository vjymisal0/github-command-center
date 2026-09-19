import { PageHeader } from '../../components';
import { api } from '../../lib/api';

export default async function ConnectionsPage() {
  const connections = await api.connections();
  return <section><PageHeader eyebrow="Settings" title="GitHub connections"><p>App setup and PAT fallback. Tokens stay server-side only.</p></PageHeader><div className="grid">{connections.data.map((connection: any) => <div className="card" key={connection.type}><span>{connection.coverage}</span><strong>{connection.type.replace('_', ' ')}</strong><p>{connection.status}</p></div>)}</div><div className="panel"><h2>Permission checklist</h2><ul>{connections.permissionChecklist.map((item: string) => <li key={item}>{item}</li>)}</ul></div></section>;
}
