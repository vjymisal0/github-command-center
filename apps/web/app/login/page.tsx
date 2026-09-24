'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    if (mode === 'register' && form.get('password') !== form.get('confirmPassword')) { setError('Passwords do not match'); setLoading(false); return; }
    const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? 'Unable to continue'); setLoading(false); return; }
    window.location.href = '/';
  }

  return <section className="auth-page">
    <div className="panel auth-card">
      <p className="eyebrow">Secure workspace</p>
      <h1>{mode === 'login' ? 'Sign in' : 'Create the first account'}</h1>
      <p>Each account has an isolated GitHub workspace.</p>
      <a className="button github-auth" href="/api/auth/github">Continue with GitHub</a>
      <div className="auth-divider"><span>or use email</span></div>
      <form onSubmit={submit} className="login">
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></label>
        {mode === 'register' && <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>}
        {error && <div className="notice danger" role="alert">{error}</div>}
        <button className="button" type="submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
        {mode === 'login' ? 'First-time setup? Create account' : 'Already have an account? Sign in'}
      </button>
      <small>Registration is available only for the first account unless the operator enables it.</small>
    </div>
  </section>;
}
