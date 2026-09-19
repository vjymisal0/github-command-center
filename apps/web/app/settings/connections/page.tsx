import { PageHeader } from '../../components';
import { api } from '../../lib/api';

export default async function ConnectionsPage() {
  const connections = await api.connections();
  return <section><PageHeader eyebrow="Settings" title="GitHub connections"><p>App setup and PAT fallback. Tokens stay server-side only.</p></PageHeader><div className="grid">{connections.data.map((connection: any) => <div className="card" key={connection.type}><span>{connection.coverage}</span><strong>{connection.type.replace('_', ' ')}</strong><p>{connection.status}</p></div>)}</div><form className="panel login" action="http://localhost:4000/connections/pat/test" method="post"><h2>Test fine-grained PAT</h2><p>Validates the token with GitHub and returns coverage hints. This slice does not save it yet.</p><label>Token<input name="token" type="password" placeholder="github_pat_..." required /></label><button className="button" type="submit">Test token</button></form><div className="panel"><h2>Permission checklist</h2><ul>{connections.permissionChecklist.map((item: string) => <li key={item}>{item}</li>)}</ul></div></section>;
}
