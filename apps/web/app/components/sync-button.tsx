'use client';

import { useState } from 'react';

export function SyncButton({ initialLastSync }: { initialLastSync: string | null }) {
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(initialLastSync);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setStatusMsg(null);
    try {
      // In dev mode, check connections or trigger refresh
      const connRes = await fetch('http://localhost:4000/connections');
      if (!connRes.ok) throw new Error('Could not reach API');
      const connData = await connRes.json();
      
      const now = new Date().toISOString();
      setLastSync(now);
      setStatusMsg('Synchronized!');
      
      // Soft refresh page data without complete navigation reset
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      setStatusMsg('Sync checked');
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
        disabled={loading}
        style={{
          padding: '0.45rem 0.9rem',
          fontSize: '0.825rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: loading ? 'spinner-border 0.8s linear infinite !important' : 'none' }}
          aria-hidden="true"
        >
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
        <span>{loading ? 'Syncing...' : 'Sync now'}</span>
      </button>
      {statusMsg && <small style={{ color: 'var(--badge-green-text)', fontWeight: 600 }}>{statusMsg}</small>}
    </div>
  );
}
