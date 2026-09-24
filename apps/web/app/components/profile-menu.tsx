'use client';

import { useEffect, useRef, useState } from 'react';

export function ProfileMenu({ user }: { user: { email: string; name: string | null } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  return <div ref={ref} className="profile-menu">
    <button type="button" className="avatar" onClick={() => setOpen(!open)} aria-label="Open account menu" aria-expanded={open}>{initials}</button>
    {open && <div className="profile-popover">
      <div><strong>{user.name || 'OSS Tracker user'}</strong><small>{user.email}</small></div>
      <a href="/settings/connections">Git Access</a>
      <button type="button" onClick={logout}>Sign out</button>
    </div>}
  </div>;
}
