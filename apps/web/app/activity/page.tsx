import { PageHeader } from '../components';

export default function ActivityPage() {
  return <section><PageHeader eyebrow="Activity" title="Contribution timeline" /><div className="panel"><ol className="timeline"><li><strong>Today</strong><span>Repository sync scaffold created.</span></li><li><strong>This week</strong><span>Action rules and dashboard shell started.</span></li></ol></div></section>;
}
