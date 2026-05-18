// /flashcards — pagina de overview a flashcards-urilor userului.
// Afișează statistici și lista de "decks" (grupate pe notiță).
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

export default function FlashcardsPage() {
  const { user, loading: authLoading, darkMode } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get('/auth/me/flashcards/stats')
      .then(res => setStats(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function removeDeck(noteId) {
    if (!confirm(t('flashcards.confirmDelete'))) return;
    try {
      await api.delete('/auth/me/flashcards', { params: { noteId } });
      const res = await api.get('/auth/me/flashcards/stats');
      setStats(res.data);
    } catch (err) {
      alert(err.response?.data?.error || t('common.deleteError'));
    }
  }

  if (authLoading || !user) return <p>{t('common.loading')}</p>;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <h1 style={titleStyle(darkMode)}>🎴 {t('flashcards.title')}</h1>
      <p style={mutedStyle(darkMode)}>{t('flashcards.subtitle')}</p>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p style={{ color: '#ef4444' }}>{t('common.error')}: {error}</p>}

      {stats && (
        <>
          <div style={statsGridStyle}>
            <StatCard label={t('flashcards.totalCards')} value={stats.total} darkMode={darkMode} />
            <StatCard label={t('flashcards.dueToday')} value={stats.due} highlight darkMode={darkMode} />
            <StatCard label={t('flashcards.newCards')} value={stats.dueToday} darkMode={darkMode} />
          </div>

          <div style={{ marginTop: 24 }}>
            {stats.due > 0 ? (
              <Link to="/flashcards/study" style={primaryBtnStyle(darkMode)}>
                ▶ {t('flashcards.study')} ({stats.due})
              </Link>
            ) : (
              <div style={readyMsgStyle(darkMode)}>
                ✓ {t('flashcards.finished')}
              </div>
            )}
          </div>

          <h2 style={{ ...sectionTitleStyle(darkMode), marginTop: 32 }}>{t('flashcards.deck')}</h2>
          {stats.decks.length === 0 ? (
            <div style={emptyStyle(darkMode)}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>📭 {t('flashcards.empty')}</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.decks.map(d => (
                <li key={d.noteId} style={deckRowStyle(darkMode)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/notes/${d.noteId}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                      {d.note.title}
                    </Link>
                    <div style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#888' }}>
                      {d.note.subject} • {d.count}
                    </div>
                  </div>
                  <Link to={`/flashcards/study?noteId=${d.noteId}`} style={smallBtnStyle(darkMode)}>
                    {t('flashcards.study')}
                  </Link>
                  <button onClick={() => removeDeck(d.noteId)} style={removeBtnStyle(darkMode)} aria-label={t('flashcards.deleteDeck')}>🗑</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight, darkMode }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 10,
      border: highlight
        ? (darkMode ? '1px solid rgba(168, 85, 247, 0.8)' : '1px solid rgba(168, 85, 247, 0.5)')
        : (darkMode ? '1px solid rgba(120, 60, 200, 0.25)' : '1px solid rgba(244, 114, 182, 0.3)'),
      background: highlight
        ? (darkMode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(244, 114, 182, 0.1)')
        : (darkMode ? 'rgba(20, 8, 50, 0.5)' : 'rgba(255, 255, 255, 0.6)'),
      color: darkMode ? '#e8e0ff' : '#1a1a1a',
    }}>
      <div style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const titleStyle = (darkMode) => ({ fontSize: 28, marginBottom: 8, color: darkMode ? '#e8e0ff' : '#1a1a1a' });
const mutedStyle = (darkMode) => ({ color: darkMode ? '#a89bc4' : '#666', fontSize: 14, marginBottom: 24 });
const sectionTitleStyle = (darkMode) => ({ fontSize: 20, color: darkMode ? '#e8e0ff' : '#1a1a1a', marginBottom: 12 });
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 };
const primaryBtnStyle = (darkMode) => ({
  display: 'inline-block', padding: '12px 24px', borderRadius: 8,
  background: darkMode ? 'rgba(168, 85, 247, 0.25)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
  color: darkMode ? '#e8d4ff' : '#fff',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.6)' : 'none',
  fontWeight: 600, textDecoration: 'none',
});
const readyMsgStyle = (darkMode) => ({
  padding: '12px 16px', borderRadius: 8,
  background: darkMode ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.1)',
  color: darkMode ? '#86efac' : '#16a34a',
  border: darkMode ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(34, 197, 94, 0.3)',
});
const emptyStyle = (darkMode) => ({
  textAlign: 'center', padding: '32px 16px', borderRadius: 10,
  border: darkMode ? '1px dashed rgba(168, 85, 247, 0.35)' : '1px dashed rgba(244, 114, 182, 0.4)',
  background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.5)',
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
});
const deckRowStyle = (darkMode) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
  borderRadius: 8,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.2)' : '1px solid rgba(244, 114, 182, 0.25)',
  background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.6)',
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
});
const smallBtnStyle = (darkMode) => ({
  padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
  background: darkMode ? 'rgba(168, 85, 247, 0.18)' : 'rgba(244, 114, 182, 0.15)',
  color: darkMode ? '#e8d4ff' : '#9333ea',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(244, 114, 182, 0.4)',
  textDecoration: 'none',
});
const removeBtnStyle = (darkMode) => ({
  padding: '6px 10px', borderRadius: 6,
  background: 'transparent',
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.25)' : '1px solid rgba(244, 114, 182, 0.3)',
  color: darkMode ? '#a89bc4' : '#666',
  cursor: 'pointer',
});
