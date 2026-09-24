import './styles.css';
import './refinements.css';
import { Inter, Outfit, Geist_Mono } from 'next/font/google';
import { ProfileMenu } from './components/profile-menu';
import { FontPicker } from './components/font-picker';
import { api } from './lib/api';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-outfit' });
const mono = Geist_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-geist-mono' });

export const metadata = { title: 'OSS Tracker', description: 'Your isolated open-source contribution command center.' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await api.me();
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${mono.variable}`}>
      <body>
        <nav className="topnav" aria-label="Main navigation">
          <a href="/" className="brand"><strong><span>&gt;_</span> OSS Tracker</strong></a>
          {user && <div className="navlinks"><a href="/">Overview</a><a href="/inbox">Inbox</a><a href="/pull-requests">PRs</a><a href="/repositories">Repositories</a><a href="/settings/connections">Git Access</a></div>}
          <div className="navtools"><FontPicker />{user ? <ProfileMenu user={user} /> : <a href="/login">Sign in</a>}</div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
