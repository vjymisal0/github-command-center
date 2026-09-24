import './styles.css';
import './refinements.css';
import { DM_Sans, Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google';
import { ProfileMenu } from './components/profile-menu';
import { api } from './lib/api';

const bodyFont = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans' });
const displayFont = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-bricolage' });
const monoFont = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap', variable: '--font-plex-mono' });

export const metadata = { title: 'OSS Tracker', description: 'Your isolated open-source contribution command center.' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await api.me();
  return (
    <html lang="en" suppressHydrationWarning className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}>
      <body>
        <nav className="topnav" aria-label="Main navigation">
          <a href="/" className="brand"><strong><span>&gt;_</span> OSS Tracker</strong></a>
          {user && <div className="navlinks"><a href="/">Overview</a><a href="/inbox">Inbox</a><a href="/pull-requests">PRs</a><a href="/repositories">Repositories</a><a href="/settings/connections">Git Access</a></div>}
          <div className="navtools">{user ? <ProfileMenu user={user} /> : <a href="/login">Sign in</a>}</div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
