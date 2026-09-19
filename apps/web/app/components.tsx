export function Status({ children }: { children: React.ReactNode }) {
  return <span className="status">{children}</span>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <header className="pageHeader"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</header>;
}
