import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ProfilePage() {
  const { username } = useParams();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/notes', { params: { author: username, pageSize: 50 } })
      .then((res) => setNotes(res.data.notes))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <p>Se încarcă...</p>;
  if (error) return <p style={{ color: 'red' }}>Eroare: {error}</p>;

  return (
    <div>
      <h1>@{username}</h1>
      <h2 style={{ marginTop: 32 }}>Notițe ({notes.length})</h2>
      {notes.length === 0 ? (
        <p style={{ color: '#666' }}>Nicio notiță publicată încă.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {notes.map((note) => (
            <li key={note.id} style={cardStyle}>
              <Link to={`/notes/${note.id}`} style={{ textDecoration: 'none', color: '#333' }}>
                <h3 style={{ margin: 0 }}>{note.title}</h3>
              </Link>
              <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>
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
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  marginBottom: 12,
};
