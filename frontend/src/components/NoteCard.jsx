// Card reutilizabil pentru afișarea unei notițe în liste (Homepage, /saved etc).
// Suportă bookmark — apare doar dacă userul e logat.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

export function NoteCard({ note, similarity, showSaveButton = true }) {
  const { user, darkMode } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !showSaveButton) return;
    // Stare inițială: e salvată sau nu?
    let cancelled = false;
    api.get(`/notes/${note.id}/save`)
      .then(res => { if (!cancelled) setSaved(!!res.data?.saved); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [note.id, user, showSaveButton]);

  async function toggleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (saving || !user) return;
    setSaving(true);
    try {
      if (saved) {
        await api.delete(`/notes/${note.id}/save`);
        setSaved(false);
      } else {
        await api.post(`/notes/${note.id}/save`);
        setSaved(true);
      }
    } catch (err) {
      console.error('Save toggle failed:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="note-card" data-flip-id={note.id} style={cardStyle(darkMode)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        {similarity != null ? (
          <span style={similarityBadgeStyle(similarity)}>{Math.round(similarity * 100)}% potrivire</span>
        ) : <span />}
        {user && showSaveButton && (
          <button
            onClick={toggleSave}
            disabled={saving}
            title={saved ? 'Elimină din salvate' : 'Salvează'}
            aria-label={saved ? 'Elimină din salvate' : 'Salvează'}
            style={saveBtnStyle(darkMode, saved, saving)}
          >
            {saved ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <Link to={`/notes/${note.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <h3 style={{ margin: '4px 0 0', fontSize: 16, lineHeight: 1.3 }}>{note.title}</h3>
      </Link>
      <p style={{ margin: '6px 0 4px', color: darkMode ? '#a89bc4' : '#888', fontSize: 13 }}>
        {note.subject} • clasa a {note.gradeLevel}-a
      </p>
      <p style={{ margin: '0 0 4px', color: darkMode ? '#867aa3' : '#aaa', fontSize: 12 }}>{note.type}</p>
      <p style={{ margin: 0, fontSize: 12, color: darkMode ? '#a89bc4' : '#888' }}>
        de{' '}
        <Link to={`/profile/${note.author.username}`} style={{ color: 'inherit' }}>
          {note.author.username}
        </Link>
        {note.author.isTeacher && (
          <span title="Profesor verificat" style={{ marginLeft: 4, color: '#22c55e' }}>✓</span>
        )}
        {note.ratingCount > 0 && (
          <> • ⭐ {note.avgRating.toFixed(1)} ({note.ratingCount})</>
        )}
      </p>
      {Array.isArray(note.tags) && note.tags.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {note.tags.slice(0, 4).map(t => {
            const tag = t.tag || t;
            return (
              <span key={tag.id || tag.name} style={tagPillStyle(darkMode, tag.isOfficial)}>
                #{tag.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

const tagPillStyle = (darkMode, isOfficial) => ({
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 999,
  background: isOfficial
    ? (darkMode ? 'rgba(168, 85, 247, 0.22)' : 'rgba(168, 85, 247, 0.15)')
    : (darkMode ? 'rgba(120, 60, 200, 0.12)' : 'rgba(244, 114, 182, 0.12)'),
  color: isOfficial
    ? (darkMode ? '#e8d4ff' : '#7c3aed')
    : (darkMode ? '#c9a8ff' : '#9333ea'),
  border: '1px solid transparent',
});

const cardStyle = (darkMode) => ({
  padding: 14,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.18)' : '1px solid rgba(244, 114, 182, 0.25)',
  borderRadius: 10,
  background: darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 120,
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});

const saveBtnStyle = (darkMode, saved, saving) => ({
  background: 'transparent',
  border: 'none',
  cursor: saving ? 'wait' : 'pointer',
  padding: '2px 4px',
  fontSize: 18,
  lineHeight: 1,
  opacity: saving ? 0.5 : 1,
  filter: saved ? 'none' : (darkMode ? 'grayscale(0.5)' : 'grayscale(0.7)'),
  transition: 'opacity 0.2s ease, filter 0.2s ease',
});

function similarityBadgeStyle(sim) {
  const pct = sim * 100;
  const bg = pct >= 75 ? 'rgba(34,197,94,0.15)' : pct >= 50 ? 'rgba(234,179,8,0.15)' : 'rgba(156,163,175,0.15)';
  const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#a16207' : '#6b7280';
  return {
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
    background: bg, color, whiteSpace: 'nowrap',
  };
}
