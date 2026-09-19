import { PageHeader } from '../../components';

export default function ConnectionsPage() {
  return <section><PageHeader eyebrow="Settings" title="GitHub connections"><p>App setup and PAT fallback will land here. Tokens stay server-side only.</p></PageHeader><div className="grid"><div className="card"><span>Primary</span><strong>GitHub App</strong><p>Best coverage with selected repositories and webhooks.</p></div><div className="card"><span>Fallback</span><strong>Fine-grained PAT</strong><p>Scheduled sync with explicit permission checks.</p></div></div></section>;
}
