import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/auth/users/${username}`),
      api.get('/notes', { params: { author: username, pageSize: 50 } }),
    ])
      .then(([profileRes, notesRes]) => {
        setProfile(profileRes.data);
        setNotes(notesRes.data.notes);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <p>Se încarcă...</p>;
  if (error) return <p style={{ color: 'red' }}>Eroare: {error}</p>;

  const displayName = profile.showName && profile.name ? profile.name : `@${profile.username}`;

  return (
    <div>
      <h1>{displayName}</h1>
      {profile.showName && profile.name && (
        <p style={{ color: '#888', fontSize: 15, marginTop: -16, marginBottom: 16 }}>
          @{profile.username}
        </p>
      )}

      <h2 style={{ marginTop: 32 }}>Notițe ({notes.length})</h2>
      {notes.length === 0 ? (
        <p style={{ color: '#aaa' }}>Nicio notiță publicată încă.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {notes.map((note) => (
            <li key={note.id} style={cardStyle}>
              <Link to={`/notes/${note.id}`} style={{ textDecoration: 'none', color: '#e8e0ff' }}>
                <h3 style={{ margin: 0 }}>{note.title}</h3>
              </Link>
              <p style={{ margin: '4px 0', color: '#aaa', fontSize: 14 }}>
                {note.subject} • clasa a {note.gradeLevel}-a • {note.type}
              </p>
              {note.ratingCount > 0 && (
                <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                  ⭐ {note.avgRating.toFixed(1)} ({note.ratingCount} voturi)
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
