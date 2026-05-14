// /trending — top notițe după "hot score" (engagement + recență), din ultimele
// 30 de zile. Distinct de "Cele mai populare" (popular all-time).
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';
import { NoteCard } from '../components/NoteCard.jsx';

export default function TrendingPage() {
  const { darkMode } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/notes/trending', { params: { limit: 18 } })
      .then(res => setNotes(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8, color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>
        🔥 În tendințe
      </h1>
      <p style={{ color: darkMode ? '#a89bc4' : '#666', fontSize: 14, marginBottom: 24 }}>
        Cele mai apreciate notițe din ultimele 30 de zile — combinăm vizualizări, rating-uri
        și recență. Diferit de „cele mai populare" care arată clasamentul de toate timpurile.
      </p>

      {loading && <p>Se încarcă...</p>}
      {error && <p style={{ color: '#ef4444' }}>Eroare: {error}</p>}

      {!loading && !error && (
        notes.length === 0 ? (
          <p style={{ color: darkMode ? '#a89bc4' : '#666' }}>
            Nicio notiță în tendințe momentan. Revino după ce se mai adaugă conținut.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
            {notes.map((note, i) => (
              <div key={note.id} style={{ position: 'relative' }}>
                {i < 3 && (
                  <span style={rankBadgeStyle(i, darkMode)}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                )}
                <NoteCard note={note} />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

const rankBadgeStyle = (rank, darkMode) => ({
  position: 'absolute',
  top: -8,
  left: -8,
  zIndex: 2,
  fontSize: 22,
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
});
