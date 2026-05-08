import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';

const SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];

const NOTE_TYPES = [
  { value: 'REZUMAT', label: 'Rezumat' },
  { value: 'EXERCITII', label: 'Exerciții' },
  { value: 'FISA', label: 'Fișă' },
  { value: 'HARTA_CONCEPTUALA', label: 'Hartă conceptuală' },
];

const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [result, setResult] = useState({ notes: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const subject    = searchParams.get('subject') || '';
  const gradeLevel = searchParams.get('gradeLevel') || '';
  const type       = searchParams.get('type') || '';
  const sort       = searchParams.get('sort') || 'recent';
  const page       = Number(searchParams.get('page') || 1);

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    }, { replace: true });
  }

  function setPage(p) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    }, { replace: true });
  }

  // Sincronizează câmpul de căutare cu URL-ul, cu debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (searchInput) next.set('q', searchInput); else next.delete('q');
        next.delete('page');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get('/notes', { params: Object.fromEntries(searchParams) })
      .then(res => setResult(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [searchParams.toString()]);

  return (
    <div>
      <h1>Notițe recente</h1>

      <div style={filterBarStyle}>
        <input
          type="search"
          placeholder="Caută notițe..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: 160 }}
        />
        <select value={subject} onChange={e => setParam('subject', e.target.value)} style={selectStyle}>
          <option value="">Toate materiile</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={gradeLevel} onChange={e => setParam('gradeLevel', e.target.value)} style={selectStyle}>
          <option value="">Toate clasele</option>
          {GRADE_LEVELS.map(g => <option key={g} value={g}>Clasa a {g}-a</option>)}
        </select>
        <select value={type} onChange={e => setParam('type', e.target.value)} style={selectStyle}>
          <option value="">Toate tipurile</option>
          {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={sort} onChange={e => setParam('sort', e.target.value)} style={selectStyle}>
          <option value="recent">Cele mai recente</option>
          <option value="popular">Cele mai populare</option>
          <option value="rating">Cel mai bine votate</option>
        </select>
      </div>

      {loading && <p>Se încarcă...</p>}
      {error && <p style={{ color: 'red' }}>Eroare: {error}</p>}

      {!loading && !error && (
        <>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
            {result.total} {result.total === 1 ? 'notiță găsită' : 'notițe găsite'}
          </p>

          {result.notes.length === 0 ? (
            <p>Nicio notiță găsită. Fii primul!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {result.notes.map(note => (
                <li key={note.id} style={cardStyle}>
                  <Link to={`/notes/${note.id}`} style={{ textDecoration: 'none', color: '#333' }}>
                    <h3 style={{ margin: 0 }}>{note.title}</h3>
                  </Link>
                  <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>
                    {note.subject} • clasa a {note.gradeLevel}-a • {note.type}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                    de{' '}
                    <Link to={`/profile/${note.author.username}`} style={{ color: '#555' }}>
                      {note.author.username}
                    </Link>
                    {note.ratingCount > 0 && (
                      <> • ⭐ {note.avgRating.toFixed(1)} ({note.ratingCount} voturi)</>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {result.totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                style={pageButtonStyle}
              >
                ‹ Anterior
              </button>
              <span style={{ padding: '6px 12px', color: '#666', fontSize: 14 }}>
                Pagina {page} din {result.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= result.totalPages}
                style={pageButtonStyle}
              >
                Următor ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const filterBarStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 20,
};
const selectStyle = {
  padding: '7px 10px',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: 14,
  background: 'white',
};
const cardStyle = {
  padding: 16,
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  marginBottom: 12,
};
const paginationStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 24,
};
const pageButtonStyle = {
  padding: '6px 14px',
  border: '1px solid #ccc',
  borderRadius: 4,
  background: 'white',
  cursor: 'pointer',
};
