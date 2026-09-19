export function Status({ children }: { children: React.ReactNode }) {
  const text = String(children || '').toLowerCase().replace(/[\s-]+/g, '_');
  return (
    <span className="status" data-variant={text}>
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="pageHeader">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function Spinner({ size = '1rem' }: { size?: string }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    />
  );
}

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="loader-container" role="status" style={{ justifyContent: 'center', padding: '3rem 1rem' }}>
      <Spinner size="1.25rem" />
      <span>{label}</span>
    </div>
  );
}
