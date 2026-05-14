// /activity — userul își vede istoria de acțiuni administrative (ban, warning,
// suspendare, schimbări de rol, aprobări profesor). Nu vede CINE a făcut
// acțiunea — doar acțiunea, detaliile și data.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const ACTION_LABEL = {
  BAN:              { icon: '🚫', label: 'Cont banat',          color: '#dc2626' },
  UNBAN:            { icon: '🔓', label: 'Ban ridicat',         color: '#16a34a' },
  WARN:             { icon: '⚠️', label: 'Avertisment',         color: '#f59e0b' },
  SUSPEND:          { icon: '⏸', label: 'Suspendare',          color: '#f59e0b' },
  UNSUSPEND:        { icon: '▶', label: 'Suspendare ridicată', color: '#16a34a' },
  ROLE_CHANGE:      { icon: '👤', label: 'Schimbare rol',       color: '#3b82f6' },
  TEACHER_APPROVE:  { icon: '✅', label: 'Profesor aprobat',    color: '#16a34a' },
  TEACHER_REJECT:   { icon: '❌', label: 'Cerere profesor respinsă', color: '#dc2626' },
  TEACHER_SET:      { icon: '✓',  label: 'Profesor marcat manual', color: '#16a34a' },
  TEACHER_UNSET:    { icon: '✗',  label: 'Statut profesor revocat', color: '#dc2626' },
};

export default function MyActivityPage() {
  const { user, loading: authLoading, darkMode } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    api.get('/auth/me/audit-log')
      .then(res => setEntries(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>📋 Activitate cont</h1>
      <p style={{ color: darkMode ? '#a89bc4' : '#666', fontSize: 14, marginBottom: 24 }}>
        Istoricul acțiunilor administrative aplicate contului tău. Pentru transparență,
        toate banurile/avertismentele/schimbările de rol sunt înregistrate aici.
      </p>

      {loading && <p>Se încarcă...</p>}
      {error && <p style={{ color: '#ef4444' }}>Eroare: {error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p style={{ color: darkMode ? '#a89bc4' : '#666' }}>Niciun eveniment înregistrat.</p>
      )}

      {!loading && !error && entries.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(entry => {
            const cfg = ACTION_LABEL[entry.action] || { icon: '•', label: entry.action, color: '#888' };
            let detailsObj = null;
            if (entry.details) {
              try { detailsObj = JSON.parse(entry.details); } catch { detailsObj = { text: entry.details }; }
            }
            return (
              <li key={entry.id} style={entryStyle(darkMode, cfg.color)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                  <strong style={{ color: cfg.color }}>{cfg.label}</strong>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: darkMode ? '#867aa3' : '#888' }}>
                    {new Date(entry.createdAt).toLocaleString('ro-RO')}
                  </span>
                </div>
                {detailsObj && (
                  <pre style={detailsStyle(darkMode)}>
                    {Object.entries(detailsObj).map(([k, v]) => (
                      <div key={k}><strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                    ))}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p style={{ marginTop: 24, fontSize: 12, color: darkMode ? '#867aa3' : '#888' }}>
        <Link to="/settings" style={{ color: darkMode ? '#c9a8ff' : '#6366f1' }}>← Înapoi la setări</Link>
      </p>
    </div>
  );
}

const entryStyle = (darkMode, color) => ({
  padding: 12,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.2)' : '1px solid rgba(244, 114, 182, 0.25)',
  borderLeft: `4px solid ${color}`,
  borderRadius: 6,
  background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.6)',
});

const detailsStyle = (darkMode) => ({
  margin: '6px 0 0',
  padding: '6px 10px',
  fontSize: 12,
  fontFamily: 'inherit',
  background: darkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.04)',
  borderRadius: 4,
  whiteSpace: 'pre-wrap',
  color: darkMode ? '#d4c8ff' : '#444',
});
