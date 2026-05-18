// /saved — lista notițelor salvate de userul curent.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { NoteCard } from '../components/NoteCard.jsx';

export default function SavedPage() {
  const { user, loading: authLoading, darkMode } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') || 1);
  const [data, setData] = useState({ notes: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    api.get('/auth/me/saved', { params: { page } })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [user, page]);

  function setPage(p) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    }, { replace: true });
  }

  if (authLoading || !user) return <p>{t('common.loading')}</p>;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <h1 style={titleStyle(darkMode)}>❤️ {t('saved.title')}</h1>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p style={{ color: '#ef4444' }}>{t('common.error')}: {error}</p>}

      {!loading && !error && (
        <>
          <p style={{ color: darkMode ? '#a89bc4' : '#888', fontSize: 13, marginBottom: 12 }}>
            {data.total}
          </p>

          {data.notes.length === 0 ? (
            <div style={emptyStateStyle(darkMode)}>
              <p style={{ fontSize: 18, marginBottom: 8 }}>📭 {t('saved.empty')}</p>
              <Link to="/" style={linkStyle(darkMode)}>← {t('menu.home')}</Link>
            </div>
          ) : (
            <div style={gridStyle}>
              {data.notes.map(note => <NoteCard key={note.id} note={note} />)}
            </div>
          )}

          {data.totalPages > 1 && (
            <div style={paginationStyle}>
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} style={pageButtonStyle(darkMode)}>
                ‹ {t('common.previous')}
              </button>
              <span style={{ padding: '6px 12px', color: darkMode ? '#a89bc4' : '#888', fontSize: 14 }}>
                {page} / {data.totalPages}
              </span>
              <button onClick={() => setPage(page + 1)} disabled={page >= data.totalPages} style={pageButtonStyle(darkMode)}>
                {t('common.next')} ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const titleStyle = (darkMode) => ({
  fontSize: 28,
  marginBottom: 8,
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
});
const mutedStyle = (darkMode) => ({
  color: darkMode ? '#a89bc4' : '#666',
  fontSize: 14,
  marginBottom: 24,
});
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 14,
};
const emptyStateStyle = (darkMode) => ({
  textAlign: 'center',
  padding: '48px 24px',
  border: darkMode ? '1px dashed rgba(168, 85, 247, 0.35)' : '1px dashed rgba(244, 114, 182, 0.4)',
  borderRadius: 12,
  background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.5)',
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
});
const linkStyle = (darkMode) => ({
  color: darkMode ? '#c9a8ff' : '#6366f1',
  textDecoration: 'none',
  fontWeight: 600,
});
const paginationStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 8, marginTop: 24,
};
const pageButtonStyle = (darkMode) => ({
  padding: '6px 14px',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc',
  background: 'transparent',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 4,
  cursor: 'pointer',
});
