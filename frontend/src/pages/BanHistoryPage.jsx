import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const STATUS_LABEL = {
  PENDING:  { label: 'În așteptare', color: '#f59e0b' },
  OPEN:     { label: 'În analiză',   color: '#3b82f6' },
  RESOLVED: { label: 'Soluționat',   color: '#10b981' },
};

const RESOLUTION_LABEL = {
  UPHELD:     { label: 'Ban menținut', color: '#dc2626' },
  OVERTURNED: { label: 'Ban ridicat',  color: '#10b981' },
};

export default function BanHistoryPage() {
  const { darkMode } = useAuth();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.get('/auth/ban-history')
      .then(res => setHistory(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Se încarcă...</p>;
  if (error) return <p style={{ color: 'red' }}>Eroare: {error}</p>;

  if (!history) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
        <h1>Istoric ban</h1>
        <p style={{ color: darkMode ? '#a89bc4' : '#6b7280' }}>
          Nu ai niciun istoric de ban. 🎉
        </p>
      </div>
    );
  }

  const records = history.records || [];

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Istoric ban</h1>
      <p style={{ color: darkMode ? '#a89bc4' : '#6b7280' }}>
        {history.currentlyBanned
          ? '🚫 Contul tău este momentan banat.'
          : '✓ Contul tău a fost banat în trecut, dar a fost ridicat.'}
        {history.banCount > 0 && (
          <> Ai fost banat de <strong>{history.banCount}</strong>{' '}
          {history.banCount === 1 ? 'dată' : 'ori'} în total.</>
        )}
      </p>

      {records.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18 }}>Toate ban-urile primite</h2>
          {records.map((rec, i) => (
            <div key={rec.id} style={cardStyle(darkMode)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ ...badgeStyle, background: rec.liftedAt ? '#10b981' : '#dc2626' }}>
                  {rec.liftedAt ? 'Ridicat' : 'Activ'}
                </span>
                <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                  Ban #{records.length - i} • {new Date(rec.bannedAt).toLocaleString('ro-RO')}
                </span>
              </div>
              {rec.reason && (
                <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>
                  <strong>Motiv:</strong> {rec.reason}
                </p>
              )}
              {rec.note && (
                <p style={{ margin: '0 0 6px', fontSize: 13 }}>
                  Notița: <Link to={`/notes/${rec.note.id}`} style={{ color: darkMode ? '#c4b5fd' : '#5b21b6' }}>{rec.note.title}</Link>
                </p>
              )}
              {rec.comment && (
                <p style={{ margin: '0 0 6px', fontSize: 13, fontStyle: 'italic' }}>
                  Comentariu: „{rec.comment.content}"
                </p>
              )}
              {rec.liftedAt && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: darkMode ? '#6ee7b7' : '#059669' }}>
                  Ridicat la {new Date(rec.liftedAt).toLocaleString('ro-RO')}
                  {rec.liftReason === 'APPEAL_OVERTURNED' && ' (în urma unui apel)'}
                  {rec.liftReason === 'ADMIN_UNBAN' && ' (de un admin)'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={cardStyle(darkMode)}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Ultimul ban</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <Block label="Data ban" darkMode={darkMode}>
            {new Date(history.bannedAt).toLocaleString('ro-RO')}
          </Block>

          {history.banReason && (
            <Block label="Motiv" darkMode={darkMode}>
              <span style={{ whiteSpace: 'pre-wrap' }}>{history.banReason}</span>
            </Block>
          )}

          {history.banNote && (
            <Block label="Notița" darkMode={darkMode}>
              <Link to={`/notes/${history.banNote.id}`} style={{ color: darkMode ? '#c4b5fd' : '#5b21b6', fontWeight: 600 }}>
                {history.banNote.title}
              </Link>
              <span style={{ color: darkMode ? '#9ca3af' : '#6b7280', marginLeft: 8 }}>
                ({history.banNote.subject})
              </span>
            </Block>
          )}

          {history.banComment && (
            <Block label="Comentariu" darkMode={darkMode}>
              <p style={{ margin: 0, fontStyle: 'italic' }}>„{history.banComment.content}"</p>
              {history.banComment.note && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                  pe notița <Link to={`/notes/${history.banComment.note.id}`}>{history.banComment.note.title}</Link>
                </p>
              )}
            </Block>
          )}
        </div>
      </div>

      {history.appeals.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Apelurile tale</h2>
          {history.appeals.map(a => {
            const st = STATUS_LABEL[a.status];
            return (
              <div key={a.id} style={cardStyle(darkMode)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ ...badgeStyle, background: st.color }}>{st.label}</span>
                  <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                    {new Date(a.createdAt).toLocaleString('ro-RO')}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{a.message}</p>
                {a.status === 'RESOLVED' && a.resolution && (
                  <div style={{ padding: 10, borderRadius: 6, background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                    <p style={{ margin: 0 }}>
                      <strong>Verdict:</strong>{' '}
                      <span style={{ color: RESOLUTION_LABEL[a.resolution]?.color }}>
                        {RESOLUTION_LABEL[a.resolution]?.label}
                      </span>
                    </p>
                    {a.adminResponse && (
                      <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{a.adminResponse}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Block({ label, children, darkMode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? '#a89bc4' : '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ padding: 10, borderRadius: 6, background: darkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.05)' }}>
        {children}
      </div>
    </div>
  );
}

const cardStyle = (darkMode) => ({
  marginTop: 12,
  padding: 16, borderRadius: 10,
  background: darkMode ? 'rgba(20, 8, 50, 0.6)' : 'rgba(255, 255, 255, 0.85)',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #e5e7eb',
});

const badgeStyle = {
  display: 'inline-block', padding: '2px 10px', borderRadius: 999,
  color: 'white', fontSize: 12, fontWeight: 600,
};
