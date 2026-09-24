import './styles.css';
import './refinements.css';
import { Inter, Outfit, Geist_Mono } from 'next/font/google';
import { ThemeToggle } from './components/theme-toggle';
import { ProfileMenu } from './components/profile-menu';
import { api } from './lib/api';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-display' });
const mono = Geist_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono' });

export const metadata = { title: 'OSS Tracker', description: 'Your isolated open-source contribution command center.' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await api.me();
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${mono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.setAttribute('data-theme','dark')}catch{}` }} /></head>
      <body>
        <nav className="topnav" aria-label="Main navigation">
          <a href="/" className="brand"><strong><span>&gt;_</span> OSS Tracker</strong></a>
          {user && <div className="navlinks"><a href="/">Overview</a><a href="/inbox">Inbox</a><a href="/pull-requests">PRs</a><a href="/repositories">Repositories</a><a href="/settings/connections">Git Access</a></div>}
          <div className="navtools"><ThemeToggle />{user ? <ProfileMenu user={user} /> : <a href="/login">Sign in</a>}</div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
