'use client';

import { useState, useEffect } from 'react';

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/pull-requests?search=${encodeURIComponent(query.trim())}`;
    }
  }

  return (
    <>
      <button
        className="search"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Global search"
        title="Press ⌘K to search"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.65rem',
          fontSize: '0.8rem',
          color: 'var(--muted)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span>Search...</span>
        <kbd style={{ fontSize: '0.75rem', opacity: 0.8 }}>⌘K</kbd>
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '15vh',
            zIndex: 1000,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1rem', borderBottom: '1px solid var(--line)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.65rem' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search PRs, repositories, or authors..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                }}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem',
                }}
              >
                ESC
              </button>
            </form>
            <div style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
              Quick jumps:
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <a href="/inbox" className="button secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Inbox</a>
                <a href="/pull-requests" className="button secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Pull Requests</a>
                <a href="/repositories" className="button secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Repositories</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
