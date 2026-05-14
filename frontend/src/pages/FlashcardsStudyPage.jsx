// /flashcards/study — sesiune de revizuire SM-2.
// Carduri scadente, flip pe click, rating Again/Hard/Good/Easy.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

// Mapping rating UI → SM-2 quality (0-5).
// Again = 2 (resetează), Hard = 3 (corect cu efort), Good = 4 (corect normal), Easy = 5 (corect ușor).
const RATINGS = [
  { key: 'again', label: 'Iar',  quality: 2, color: '#dc2626', shortcut: '1' },
  { key: 'hard',  label: 'Greu', quality: 3, color: '#f59e0b', shortcut: '2' },
  { key: 'good',  label: 'Bun',  quality: 4, color: '#16a34a', shortcut: '3' },
  { key: 'easy',  label: 'Ușor', quality: 5, color: '#3b82f6', shortcut: '4' },
];

export default function FlashcardsStudyPage() {
  const { user, loading: authLoading, darkMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const noteIdFilter = searchParams.get('noteId') || null;

  const [queue, setQueue]   = useState([]); // cards rămase
  const [idx, setIdx]       = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]   = useState({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const params = { due: 1 };
    if (noteIdFilter) params.noteId = noteIdFilter;
    api.get('/auth/me/flashcards', { params })
      .then(res => {
        // Amestecăm ordinea pentru variabilitate.
        const shuffled = [...res.data].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user, noteIdFilter]);

  const current = queue[idx];

  async function handleRate(quality, key) {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/auth/me/flashcards/${current.id}/review`, { rating: quality });
      setStats(s => ({ ...s, reviewed: s.reviewed + 1, [key]: s[key] + 1 }));
      // Trecem la următorul card.
      if (idx + 1 >= queue.length) {
        setIdx(queue.length); // marchează final
      } else {
        setIdx(idx + 1);
      }
      setShowBack(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la salvarea reviewului');
    } finally {
      setSubmitting(false);
    }
  }

  // Shortcut-uri tastatură.
  useEffect(() => {
    function onKey(e) {
      if (!current) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!showBack) setShowBack(true);
        return;
      }
      if (!showBack) return;
      const r = RATINGS.find(x => x.shortcut === e.key);
      if (r) handleRate(r.quality, r.key);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, showBack, queue, idx, submitting]); // eslint-disable-line

  if (authLoading || !user) return <p>Se încarcă...</p>;
  if (loading) return <p style={{ textAlign: 'center', padding: 32 }}>Se încarcă...</p>;

  // Sesiune finalizată
  const done = !current;

  if (done) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 24 }}>
        <h1 style={{ color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>
          {stats.reviewed > 0 ? '🎉 Sesiune terminată!' : '✓ Niciun card scadent'}
        </h1>
        {stats.reviewed > 0 ? (
          <>
            <p style={{ color: darkMode ? '#a89bc4' : '#666' }}>
              Ai revizuit <strong>{stats.reviewed}</strong> {stats.reviewed === 1 ? 'card' : 'carduri'}.
            </p>
            <div style={statsRowStyle(darkMode)}>
              <StatTile label="Iar"   value={stats.again} color="#dc2626" darkMode={darkMode} />
              <StatTile label="Greu"  value={stats.hard}  color="#f59e0b" darkMode={darkMode} />
              <StatTile label="Bun"   value={stats.good}  color="#16a34a" darkMode={darkMode} />
              <StatTile label="Ușor"  value={stats.easy}  color="#3b82f6" darkMode={darkMode} />
            </div>
          </>
        ) : (
          <p style={{ color: darkMode ? '#a89bc4' : '#666' }}>
            Revino mai târziu — algoritmul SM-2 a programat următoarele revizuiri.
          </p>
        )}
        <Link to="/flashcards" style={backLinkStyle(darkMode)}>← Înapoi la flashcards</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <div style={progressStyle(darkMode)}>
        Card {idx + 1} / {queue.length} • Revizuite: {stats.reviewed}
      </div>

      <div
        onClick={() => !showBack && setShowBack(true)}
        style={cardStyle(darkMode, showBack)}
        role="button"
        tabIndex={0}
      >
        {!showBack ? (
          <>
            <div style={cardLabelStyle(darkMode)}>Întrebare</div>
            <div style={cardTextStyle(darkMode)}>{current.front}</div>
            <div style={cardHintStyle(darkMode)}>Click sau spațiu pentru a vedea răspunsul</div>
          </>
        ) : (
          <>
            <div style={cardLabelStyle(darkMode)}>Întrebare</div>
            <div style={{ ...cardTextStyle(darkMode), fontSize: 18, opacity: 0.7, marginBottom: 16 }}>
              {current.front}
            </div>
            <hr style={hrStyle(darkMode)} />
            <div style={cardLabelStyle(darkMode)}>Răspuns</div>
            <div style={cardTextStyle(darkMode)}>{current.back}</div>
          </>
        )}
        {current.note && (
          <div style={noteRefStyle(darkMode)}>
            din <Link to={`/notes/${current.note.id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit' }}>
              {current.note.title}
            </Link>
          </div>
        )}
      </div>

      {showBack && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#666', textAlign: 'center', marginBottom: 8 }}>
            Cât de bine știai?
          </div>
          <div style={ratingRowStyle}>
            {RATINGS.map(r => (
              <button
                key={r.key}
                onClick={() => handleRate(r.quality, r.key)}
                disabled={submitting}
                style={ratingBtnStyle(darkMode, r.color)}
                title={`Shortcut: ${r.shortcut}`}
              >
                <div style={{ fontSize: 16, fontWeight: 700 }}>{r.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{r.shortcut}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link to="/flashcards" style={backLinkStyle(darkMode)}>← Întrerupe sesiunea</Link>
      </div>
    </div>
  );
}

function StatTile({ label, value, color, darkMode }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8, flex: 1, minWidth: 80,
      border: `1px solid ${color}33`,
      background: `${color}15`,
    }}>
      <div style={{ fontSize: 11, color: darkMode ? '#a89bc4' : '#666', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const progressStyle = (darkMode) => ({
  fontSize: 13, color: darkMode ? '#a89bc4' : '#888', textAlign: 'center', marginBottom: 16,
});
const cardStyle = (darkMode, showBack) => ({
  minHeight: 260,
  padding: 24,
  borderRadius: 12,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(244, 114, 182, 0.4)',
  background: darkMode ? 'rgba(20, 8, 50, 0.7)' : 'rgba(255, 255, 255, 0.85)',
  cursor: showBack ? 'default' : 'pointer',
  display: 'flex', flexDirection: 'column', justifyContent: 'center',
  position: 'relative',
  boxShadow: darkMode ? '0 4px 24px rgba(120, 40, 200, 0.15)' : '0 4px 24px rgba(244, 114, 182, 0.15)',
  transition: 'background 0.3s ease, border-color 0.3s ease',
});
const cardLabelStyle = (darkMode) => ({
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
  color: darkMode ? '#a89bc4' : '#888', marginBottom: 8,
});
const cardTextStyle = (darkMode) => ({
  fontSize: 22, lineHeight: 1.5,
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
});
const cardHintStyle = (darkMode) => ({
  marginTop: 'auto', paddingTop: 24,
  fontSize: 12, fontStyle: 'italic',
  color: darkMode ? '#867aa3' : '#aaa',
  textAlign: 'center',
});
const hrStyle = (darkMode) => ({
  border: 'none',
  borderTop: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(244, 114, 182, 0.3)',
  margin: '16px 0',
});
const noteRefStyle = (darkMode) => ({
  position: 'absolute', bottom: 10, right: 14,
  fontSize: 11, color: darkMode ? '#867aa3' : '#aaa',
});
const ratingRowStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
};
const ratingBtnStyle = (darkMode, color) => ({
  padding: '14px 8px', borderRadius: 8, cursor: 'pointer',
  border: `1px solid ${color}66`,
  background: `${color}15`,
  color: color,
  fontWeight: 600,
  transition: 'background 0.15s ease, transform 0.1s ease',
});
const backLinkStyle = (darkMode) => ({
  color: darkMode ? '#c9a8ff' : '#6366f1',
  textDecoration: 'none',
  fontSize: 14,
});
const statsRowStyle = (darkMode) => ({
  display: 'flex', gap: 8, marginTop: 16, marginBottom: 16,
});
