import './styles.css';
import './refinements.css';
import { ThemeToggle } from './components/theme-toggle';

export const metadata = { title: 'OSS Tracker' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch{}` }} />
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
            <a href="/pull-requests">PRs</a>
            <a href="/settings/connections">Git Access</a>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <ThemeToggle />
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
