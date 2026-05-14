// Listă publică a apelurilor împotriva banurilor — anonimizate.
// Userul vede mesajul lui, motivul ban-ului, verdictul adminului și decizia
// finală. Toate fără username-uri reale.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const RESOLUTION_LABEL = {
  UPHELD:     { label: 'Ban menținut', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
  OVERTURNED: { label: 'Ban ridicat',  color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
};

export default function PublicAppealsPage() {
  const { darkMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') || 1);
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/auth/appeals/public', { params: { page } })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [page]);

  function setPage(p) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    }, { replace: true });
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>📜 Apeluri publice</h1>
      <p style={{ color: darkMode ? '#a89bc4' : '#666', fontSize: 14, marginBottom: 24 }}>
        Apeluri ale userilor banați care au fost soluționate și pe care autorii au ales să le facă publice.
        Username-urile sunt anonimizate (primele 2 caractere + ***).
      </p>

      {loading && <p>Se încarcă...</p>}
      {error && <p style={{ color: '#ef4444' }}>Eroare: {error}</p>}

      {!loading && !error && (
        <>
          {data.items.length === 0 ? (
            <p style={{ color: darkMode ? '#a89bc4' : '#666' }}>
              Niciun apel public încă.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data.items.map(a => (
                <article key={a.id} style={cardStyle(darkMode)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>
                      @{a.anonymousUsername}
                    </strong>
                    {a.resolution && (
                      <span style={resolutionBadgeStyle(a.resolution, darkMode)}>
                        {RESOLUTION_LABEL[a.resolution]?.label || a.resolution}
                      </span>
                    )}
                  </div>
                  {a.banReason && (
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: darkMode ? '#a89bc4' : '#666' }}>
                      <strong>Motiv ban:</strong> {a.banReason}
                    </p>
                  )}
                  <div style={sectionLabelStyle(darkMode)}>Mesajul utilizatorului:</div>
                  <p style={{ margin: '4px 0 12px', whiteSpace: 'pre-wrap', fontSize: 14, color: darkMode ? '#d4c8ff' : '#222' }}>
                    {a.message}
                  </p>
                  {a.adminResponse && (
                    <>
                      <div style={sectionLabelStyle(darkMode)}>Răspunsul adminului:</div>
                      <p style={{ margin: '4px 0 8px', whiteSpace: 'pre-wrap', fontSize: 14, color: darkMode ? '#d4c8ff' : '#222' }}>
                        {a.adminResponse}
                      </p>
                    </>
                  )}
                  <div style={{ fontSize: 11, color: darkMode ? '#867aa3' : '#aaa', marginTop: 8 }}>
                    Depus: {new Date(a.createdAt).toLocaleDateString('ro-RO')}
                    {a.resolvedAt && <> • Soluționat: {new Date(a.resolvedAt).toLocaleDateString('ro-RO')}</>}
                  </div>
                </article>
              ))}
            </div>
          )}

          {data.totalPages > 1 && (
            <div style={paginationStyle}>
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} style={pageBtnStyle(darkMode)}>‹ Anterior</button>
              <span style={{ padding: '6px 12px', color: darkMode ? '#a89bc4' : '#888', fontSize: 14 }}>
                Pagina {page} / {data.totalPages}
              </span>
              <button onClick={() => setPage(page + 1)} disabled={page >= data.totalPages} style={pageBtnStyle(darkMode)}>Următor ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const cardStyle = (darkMode) => ({
  padding: 16,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.25)' : '1px solid rgba(244, 114, 182, 0.3)',
  borderRadius: 10,
  background: darkMode ? 'rgba(20, 8, 50, 0.5)' : 'rgba(255, 255, 255, 0.7)',
});

const resolutionBadgeStyle = (res, darkMode) => {
  const cfg = RESOLUTION_LABEL[res] || { color: '#888', bg: 'rgba(150,150,150,0.1)' };
  return {
    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
    color: cfg.color, background: cfg.bg,
    border: `1px solid ${cfg.color}33`,
  };
};

const sectionLabelStyle = (darkMode) => ({
  fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600,
  color: darkMode ? '#867aa3' : '#888',
});

const paginationStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 8, marginTop: 24,
};
const pageBtnStyle = (darkMode) => ({
  padding: '6px 14px',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc',
  background: 'transparent',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 4,
  cursor: 'pointer',
});
