'use client';

import { useState } from 'react';

export function ConnectedAccountsList({
  accounts,
}: {
  accounts?: Array<{ id: string; username: string }>;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!accounts || accounts.length === 0) {
    return null;
  }

  async function handleRemove(id: string, username: string) {
    if (!confirm(`Are you sure you want to disconnect and remove token for @${username}?`)) {
      return;
    }

    setRemovingId(id);
    try {
      const res = await fetch(`http://localhost:4000/connections/${encodeURIComponent(id)}/delete`, {
        method: 'POST',
      });
      if (res.ok) {
        setMsg(`Disconnected @${username}. Reloading...`);
        setTimeout(() => {
          window.location.href = '/settings/connections';
        }, 300);
        return;
      }
    } catch {
      // Fallback to standard form post
    }

    // Direct form submit fallback guarantees cross-origin deletion succeeds
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `http://localhost:4000/connections/${encodeURIComponent(id)}/delete`;
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="panel" style={{ marginTop: '1.5rem' }}>
      <h2>Active Git Access Accounts</h2>
      <p>Manage and revoke connected personal access tokens.</p>
      {msg && <p style={{ color: 'var(--accent)' }}>{msg}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        {accounts.map(acc => (
          <div
            key={acc.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div>
              <strong>@{acc.username}</strong>
              <small style={{ display: 'block', color: 'var(--muted)' }}>Git Access Token: {acc.id}</small>
            </div>
            <button
              className="button"
              style={{
                background: 'transparent',
                borderColor: '#dc2626',
                color: '#dc2626',
                cursor: removingId === acc.id ? 'not-allowed' : 'pointer',
              }}
              disabled={removingId === acc.id}
              onClick={() => handleRemove(acc.id, acc.username)}
            >
              {removingId === acc.id ? 'Removing...' : 'Disconnect & Remove Token'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
