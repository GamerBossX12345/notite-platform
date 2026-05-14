import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const PODIUM_STYLES = [
  { background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)', border: '1px solid #d97706', text: '#5b3a00', shadow: '0 2px 8px rgba(251, 191, 36, 0.4)' },
  { background: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)', border: '1px solid #6b7280', text: '#1f2937', shadow: '0 2px 8px rgba(156, 163, 175, 0.4)' },
  { background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', border: '1px solid #78350f', text: '#fef3c7', shadow: '0 2px 8px rgba(146, 64, 14, 0.4)' },
];

export default function Leaderboard({ featuredAuthor }) {
  const { darkMode } = useAuth();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    api.get('/leaderboard', { params: { limit: 10 } })
      .then(res => setEntries(res.data))
      .catch(() => {});
  }, []);

  let featured = null;
  if (featuredAuthor) {
    const fromBoard = entries.find(e => e.id === featuredAuthor.id);
    featured = fromBoard || {
      id: featuredAuthor.id,
      username: featuredAuthor.username,
      name: null,
      noteCount: null,
      rank: null,
    };
  }

  const rest = featured ? entries.filter(e => e.id !== featured.id) : entries;

  if (entries.length === 0 && !featured) return null;

  return (
    <div style={containerStyle(darkMode)}>
      {featured && (
        <>
          <h4 style={sectionLabelStyle}>Autorul:</h4>
          <Link
            to={`/profile/${featured.username}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
            title={`Autorul acestei notițe: ${featured.username}`}
          >
            <div style={featuredStyle(darkMode)}>
              <span style={{ fontSize: 14 }}>✨</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                {featured.username}
              </span>
              {featured.noteCount != null && (
                <span style={{ fontSize: 11, opacity: 0.85, flexShrink: 0 }}>
                  {featured.noteCount}
                </span>
              )}
            </div>
          </Link>
        </>
      )}

      <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>🏆 Top contribuitori</h3>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rest.slice(0, featured ? 7 : 8).map(entry => {
          const podium = entry.rank >= 1 && entry.rank <= 3 ? PODIUM_STYLES[entry.rank - 1] : null;
          return (
            <li key={entry.id} style={podium ? podiumRowStyle(podium) : rowStyle}>
              <span style={{ width: 22, flexShrink: 0, textAlign: 'center', fontSize: 13 }}>
                {RANK_MEDALS[entry.rank - 1] ?? entry.rank}
              </span>
              <Link
                to={`/profile/${entry.username}`}
                style={{ flex: 1, color: podium ? podium.text : 'inherit', textDecoration: 'none', fontSize: 13, fontWeight: podium ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {entry.username}
              </Link>
              <span style={{ fontSize: 11, opacity: podium ? 0.85 : 0.65, flexShrink: 0, color: podium ? podium.text : 'inherit' }}>
                {entry.noteCount}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const containerStyle = (darkMode) => ({
  position: 'fixed',
  top: 76,
  right: 20,
  width: 220,
  zIndex: 50,
  border: '1px solid rgba(120, 60, 200, 0.25)',
  borderRadius: 10,
  padding: 14,
  background: darkMode ? 'rgba(20, 8, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  transition: 'background 0.4s ease, color 0.4s ease, border-color 0.4s ease',
});

const sectionLabelStyle = {
  margin: '0 0 6px',
  fontSize: 11,
  fontWeight: 600,
  opacity: 0.7,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const featuredStyle = (darkMode) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 10px',
  marginBottom: 14,
  borderRadius: 8,
  background: darkMode
    ? 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)'
    : 'linear-gradient(135deg, #f472b6 0%, #22d3ee 100%)',
  color: darkMode ? '#ffffff' : '#1f1147',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(244, 114, 182, 0.6)',
  boxShadow: darkMode
    ? '0 2px 10px rgba(120, 60, 230, 0.55)'
    : '0 2px 10px rgba(244, 114, 182, 0.5)',
  fontSize: 13,
  transition: 'background 0.4s ease, color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
});

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '5px 0', borderBottom: '1px solid rgba(120, 60, 200, 0.1)',
};

const podiumRowStyle = (p) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 8px',
  marginBottom: 4,
  borderRadius: 6,
  background: p.background,
  border: p.border,
  boxShadow: p.shadow,
});
