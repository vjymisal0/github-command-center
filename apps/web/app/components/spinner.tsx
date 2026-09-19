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
