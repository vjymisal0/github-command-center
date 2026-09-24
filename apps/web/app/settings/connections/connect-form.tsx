'use client';

import { useState } from 'react';

export function ConnectPatForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const tokenInput = form.elements.namedItem('token') as HTMLInputElement;
    const token = tokenInput.value.trim();

    try {
      const res = await fetch('/api/connections/pat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to connect token. Check permissions.');
      }

      const data = await res.json();
      setSuccess(`Account @${data.user?.login || ''} connected and synchronized successfully!`);
      tokenInput.value = '';

      // Reload page to display new repositories and connected accounts without leaving UI
      setTimeout(() => {
        window.location.href = '/settings/connections?connected=true';
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to connect GitHub account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel login" onSubmit={handleSubmit}>
      <h2>Connect GitHub PAT</h2>
      <p>Paste a read-only GitHub token.</p>

      {success && (
        <div style={{ padding: '0.65rem', border: '1px solid #16a34a', color: '#16a34a', borderRadius: '0.5rem' }}>
          <strong>{success}</strong>
        </div>
      )}

      {error && (
        <div style={{ padding: '0.65rem', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '0.5rem' }}>
          <strong>{error}</strong>
        </div>
      )}

      <label>
        Token
        <input name="token" type="password" placeholder="github_pat_... or ghp_..." required disabled={loading} />
      </label>

      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Connecting…' : 'Connect GitHub'}
      </button>
    </form>
  );
}
