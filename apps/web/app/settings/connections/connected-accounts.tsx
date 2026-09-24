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
    return (
      <div className="panel" style={{ marginTop: '1.5rem', border: '1px solid var(--line)' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Active Git Access Accounts</h2>
        <p style={{ margin: '0.35rem 0 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
          No accounts currently connected. Submit a Personal Access Token below to connect your GitHub account.
        </p>
      </div>
    );
  }

  async function handleRemove(id: string, username: string) {
    if (!confirm(`Are you sure you want to disconnect and remove token for @${username}?`)) {
      return;
    }

    setRemovingId(id);
    try {
      const res = await fetch(`/api/connections/${encodeURIComponent(id)}/delete`, {
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
    form.action = `/api/connections/${encodeURIComponent(id)}/delete`;
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="panel" style={{ marginTop: '1.5rem', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Active Git Access Accounts</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Manage and revoke connected personal access tokens.
          </p>
        </div>
        <span style={{ fontSize: '0.8rem', background: 'var(--card)', border: '1px solid var(--line)', padding: '0.25rem 0.65rem', borderRadius: '999px', fontWeight: 600 }}>
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} connected
        </span>
      </div>

      {msg && <p style={{ color: 'var(--accent)', fontWeight: 600, marginTop: '0.75rem' }}>{msg}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
        {accounts.map(acc => (
          <div
            key={acc.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>@{acc.username}</strong>
                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
                  Active
                </span>
              </div>
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                Token ID: {acc.id}
              </small>
            </div>
            <button
              type="button"
              className="button danger"
              style={{
                background: '#dc2626',
                borderColor: '#dc2626',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                cursor: removingId === acc.id ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(220, 38, 38, 0.3)',
              }}
              disabled={removingId === acc.id}
              onClick={() => handleRemove(acc.id, acc.username)}
            >
              {removingId === acc.id ? 'Disconnecting...' : 'Disconnect & Remove'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
