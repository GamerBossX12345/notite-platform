import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { TeacherBadge } from '../components/Badges.jsx';

const TOP_MEDALS = {
  1: { emoji: '🥇', label: 'Top 1', color: '#f59e0b' },
  2: { emoji: '🥈', label: 'Top 2', color: '#9ca3af' },
  3: { emoji: '🥉', label: 'Top 3', color: '#b45309' },
};

export default function ProfilePage() {
  const { username } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [notes, setNotes] = useState([]);
  const [topRank, setTopRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/auth/users/${username}`),
      api.get('/notes', { params: { author: username, pageSize: 50 } }),
      api.get('/leaderboard', { params: { limit: 3 } }),
    ])
      .then(([profileRes, notesRes, leaderboardRes]) => {
        setProfile(profileRes.data);
        setNotes(notesRes.data.notes);
        const entry = leaderboardRes.data.find(e => e.username === username);
        if (entry && entry.rank <= 3) setTopRank(entry.rank);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <p>{t('common.loading')}</p>;
  if (error) return <p style={{ color: 'red' }}>{t('common.error')}: {error}</p>;

  const displayName = profile.showName && profile.name ? profile.name : `@${profile.username}`;
  const medal = topRank ? TOP_MEDALS[topRank] : null;
  const meta = [
    profile.school,
    profile.grade ? `${t('common.grade')} ${profile.grade}` : null,
  ].filter(Boolean);

  return (
    <div style={{ position: 'relative', minHeight: '60vh' }}>
      {profile.banCount > 0 && (
        <div
          style={{
            position: 'fixed', bottom: 8, right: 12, zIndex: 1,
            fontSize: 10, color: '#9ca3af', opacity: 0.55,
            pointerEvents: 'none', userSelect: 'none',
            letterSpacing: 0.2,
          }}
        >
          {profile.banCount}× {t('banHistory.title')}
        </div>
      )}
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {displayName}
          {profile.isTeacher && <TeacherBadge size={22} />}
        </span>
        {medal && (
          <span
            title={`${medal.label} pe leaderboard (cele mai multe notițe)`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 18, padding: '4px 12px', borderRadius: 999,
              background: `${medal.color}22`,
              border: `1.5px solid ${medal.color}`,
              color: medal.color, fontWeight: 600,
              letterSpacing: 0,
            }}
          >
            <span style={{ fontSize: 22 }}>{medal.emoji}</span>
            {medal.label}
          </span>
        )}
      </h1>
      {profile.showName && profile.name && (
        <p style={{ color: '#888', fontSize: 15, marginTop: -16, marginBottom: 8 }}>
          @{profile.username}
        </p>
      )}
      {meta.length > 0 && (
        <p style={{ color: '#aaa', fontSize: 14, marginTop: 0, marginBottom: 8 }}>
          {meta.join(' • ')}
        </p>
      )}
      {profile.bio && (
        <p style={{ color: '#ccc', fontSize: 14, marginBottom: 16, fontStyle: 'italic' }}>
          {profile.bio}
        </p>
      )}
      <p style={{ color: '#888', fontSize: 13, marginBottom: 0 }}>
        ⭐ {profile.reputation} {t('profile.reputation')}
      </p>

      <h2 style={{ marginTop: 32 }}>{t('profile.noteCount')} ({notes.length})</h2>
      {notes.length === 0 ? (
        <p style={{ color: '#aaa' }}>{t('profile.noNotes')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {notes.map((note) => (
            <li key={note.id} className="note-card" style={cardStyle}>
              <Link to={`/notes/${note.id}`} style={{ textDecoration: 'none', color: '#e8e0ff' }}>
                <h3 style={{ margin: 0 }}>{note.title}</h3>
              </Link>
              <p style={{ margin: '4px 0', color: '#aaa', fontSize: 14 }}>
                {note.subject} • {t('common.grade')} {note.gradeLevel} • {note.type}
              </p>
              {note.ratingCount > 0 && (
                <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                  ⭐ {note.avgRating.toFixed(1)} ({note.ratingCount})
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const cardStyle = {
  padding: 16,
  border: '1px solid rgba(100, 60, 160, 0.25)',
  borderRadius: 8,
  marginBottom: 12,
  background: 'rgba(20, 10, 40, 0.4)',
};
