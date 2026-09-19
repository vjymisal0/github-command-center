'use client';

import { useState } from 'react';

export function SyncButton({ initialLastSync, connected }: { initialLastSync: string | null; connected: boolean }) {
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(initialLastSync);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleSync() {
    if (!connected) {
      setStatusMsg('Connect GitHub first');
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const syncRes = await fetch('http://localhost:4000/sync', { method: 'POST' });
      if (!syncRes.ok) throw new Error('Sync failed');
      setLastSync(new Date().toISOString());
      setStatusMsg('Synchronized');
      setTimeout(() => window.location.reload(), 500);
    } catch {
      setStatusMsg('Sync failed');
      setLoading(false);
    }
  }

  const formattedTime = lastSync
    ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not synced';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'right' }}>
        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Last Synced
        </span>
        <strong style={{ fontSize: '0.875rem', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
          {formattedTime}
        </strong>
      </div>
      <button
        className="button secondary"
        type="button"
        onClick={handleSync}
        disabled={loading || !connected}
        title={connected ? 'Sync GitHub data' : 'Connect GitHub first'}
        style={{
          padding: '0.45rem 0.9rem',
          fontSize: '0.825rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          opacity: connected ? 1 : 0.45,
          cursor: connected ? 'pointer' : 'not-allowed',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
        <span>{loading ? 'Syncing...' : 'Sync now'}</span>
      </button>
      {statusMsg && <small style={{ color: connected ? 'var(--badge-green-text)' : 'var(--badge-amber-text)', fontWeight: 600 }}>{statusMsg}</small>}
    </div>
  );
}
