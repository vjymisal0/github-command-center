'use client';

import { useState } from 'react';
import { Spinner } from '../../components';

export function PrDescriptionViewer({ prId }: { prId: string }) {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function handleFetchDescription() {
    if (description !== null) {
      setExpanded(prev => !prev);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000'}/pull-requests/${encodeURIComponent(prId)}/description`);
      if (!res.ok) {
        throw new Error('Failed to load description');
      }
      const data = await res.json();
      setDescription(data.description || 'No description provided.');
      setExpanded(true);
    } catch (err: any) {
      setError(err.message || 'Error fetching description');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Description</h2>
          <small style={{ color: 'var(--muted)' }}>
            {description !== null ? (expanded ? 'Loaded on-demand' : 'Hidden') : 'Not loaded initially to save bandwidth'}
          </small>
        </div>

        <button
          className="button secondary"
          type="button"
          onClick={handleFetchDescription}
          disabled={loading}
          style={{ minWidth: '150px' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Spinner size="0.9rem" />
              <span>Fetching...</span>
            </span>
          ) : description !== null ? (
            expanded ? 'Hide description' : 'Show description'
          ) : (
            'Load description'
          )}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', color: '#dc2626', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {expanded && description && (
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--line)',
            whiteSpace: 'pre-wrap',
            color: 'var(--text)',
            fontSize: '0.92rem',
            lineHeight: '1.6',
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
