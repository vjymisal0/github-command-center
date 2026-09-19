import './styles.css';
import { ThemeToggle } from './components/theme-toggle';
import { ProfileMenu } from './components/profile-menu';
import { SearchModal } from './components/search-modal';

export const metadata = { title: 'OSS Tracker' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Nunito+Sans:ital,opsz,wght@0,6..12,400..700;1,6..12,400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="topnav" aria-label="Main navigation">
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <strong style={{ margin: 0, color: 'var(--text)' }}>
              <span style={{ color: 'var(--pink-accent)', marginRight: '0.2rem' }}>&gt;_</span> OSS Tracker
            </strong>
          </a>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: 1 }}>
            <a href="/">Overview</a>
            <a href="/inbox">Inbox</a>
            <a href="/pull-requests">Pull Requests</a>
            <a href="/repositories">Repositories</a>
            <a href="/settings/connections">Connections</a>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <SearchModal />
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
