import './styles.css';

export const metadata = { title: 'GitHub Command Center' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="topnav" aria-label="Main navigation">
          <strong>GitHub Command Center</strong>
          <a href="/">Overview</a>
          <a href="/inbox">Inbox</a>
          <a href="/pull-requests">Pull Requests</a>
          <a href="/repositories">Repositories</a>
          <a href="/activity">Activity</a>
          <button className="search" type="button">⌘K</button>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
