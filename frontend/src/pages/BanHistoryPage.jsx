import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

export default function BanHistoryPage() {
  const { darkMode } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ro-RO';
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const STATUS_LABEL = {
    PENDING:  { label: t('banned.statusPending'),  color: '#f59e0b' },
    OPEN:     { label: t('banned.statusOpen'),     color: '#3b82f6' },
    RESOLVED: { label: t('banned.statusResolved'), color: '#10b981' },
  };
  const RESOLUTION_LABEL = {
    UPHELD:     { label: t('appeals.resolutionUpheld'),     color: '#dc2626' },
    OVERTURNED: { label: t('appeals.resolutionOverturned'), color: '#10b981' },
  };

  useEffect(() => {
    api.get('/auth/ban-history')
      .then(res => setHistory(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>{t('common.loading')}</p>;
  if (error) return <p style={{ color: 'red' }}>{t('common.error')}: {error}</p>;

  if (!history) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
        <h1>{t('banHistory.title')}</h1>
        <p style={{ color: darkMode ? '#a89bc4' : '#6b7280' }}>
          {t('banHistory.empty')}
        </p>
      </div>
    );
  }

  const records = history.records || [];

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>{t('banHistory.title')}</h1>

      {records.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {records.map((rec, i) => (
            <div key={rec.id} style={cardStyle(darkMode)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ ...badgeStyle, background: rec.liftedAt ? '#10b981' : '#dc2626' }}>
                  {rec.liftedAt ? t('appeals.resolutionOverturned') : t('banned.statusOpen')}
                </span>
                <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                  #{records.length - i} • {new Date(rec.bannedAt).toLocaleString(locale)}
                </span>
              </div>
              {rec.reason && (
                <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>
                  <strong>{t('banHistory.reason')}:</strong> {rec.reason}
                </p>
              )}
              {rec.note && (
                <p style={{ margin: '0 0 6px', fontSize: 13 }}>
                  <Link to={`/notes/${rec.note.id}`} style={{ color: darkMode ? '#c4b5fd' : '#5b21b6' }}>{rec.note.title}</Link>
                </p>
              )}
              {rec.liftedAt && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: darkMode ? '#6ee7b7' : '#059669' }}>
                  {t('banHistory.liftedAt')}: {new Date(rec.liftedAt).toLocaleString(locale)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {history.appeals.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>{t('banned.appealForm')}</h2>
          {history.appeals.map(a => {
            const st = STATUS_LABEL[a.status];
            return (
              <div key={a.id} style={cardStyle(darkMode)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ ...badgeStyle, background: st.color }}>{st.label}</span>
                  <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                    {new Date(a.createdAt).toLocaleString(locale)}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{a.message}</p>
                {a.status === 'RESOLVED' && a.resolution && (
                  <div style={{ padding: 10, borderRadius: 6, background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                    <p style={{ margin: 0 }}>
                      <strong>{t('appeals.resolution')}:</strong>{' '}
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
