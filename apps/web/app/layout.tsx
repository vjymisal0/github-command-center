import './styles.css';

export const metadata = { title: 'GitHub Command Center' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="topnav" aria-label="Main navigation">
          <strong><span style={{ color: 'var(--accent)' }}>&gt;_</span> GitHub Command Center</strong>
          <a href="/">Overview</a>
          <a href="/inbox">Inbox</a>
          <a href="/pull-requests">Pull Requests</a>
          <a href="/settings/connections">Connections</a>
          <a href="/login">Login</a>
          <button className="search" type="button">⌘K</button>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
