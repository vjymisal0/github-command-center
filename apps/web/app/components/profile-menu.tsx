'use client';

import { useState, useRef, useEffect } from 'react';

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--surface-card)',
          border: '1px solid var(--line)',
          color: 'var(--text)',
          fontWeight: 700,
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        aria-label="User Profile"
        title="User menu"
      >
        VM
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '200px',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            padding: '0.5rem 0',
            zIndex: 200,
          }}
        >
          <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--line)' }}>
            <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text)' }}>Vijay Misal</strong>
            <small style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>@vjymisal0</small>
          </div>
          <a
            href="/settings/connections"
            style={{
              display: 'block',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              color: 'var(--text)',
              textDecoration: 'none',
            }}
            onClick={() => setOpen(false)}
          >
            GitHub Connections
          </a>
          <a
            href="/login"
            style={{
              display: 'block',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              color: 'var(--muted)',
              textDecoration: 'none',
            }}
            onClick={() => setOpen(false)}
          >
            Switch Account / Login
          </a>
        </div>
      )}
    </div>
  );
}
