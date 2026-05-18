// Istoric vizite notițe — pagină proprie, separată de HomePage.
// Sursa: useRecentNotes (localStorage, sincronizat între tab-uri).
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { useRecentNotes } from '../hooks/useRecentNotes.js';

export default function HistoryPage() {
  const { darkMode } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ro-RO';
  const { recent, clear, remove } = useRecentNotes();

  function handleClear() {
    if (confirm(t('history.confirmClear'))) clear();
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>📖 {t('history.title')}</h1>
        {recent.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: darkMode ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid #dc2626',
              color: darkMode ? '#fca5a5' : '#b91c1c',
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            }}
          >
            🗑 {t('history.clearAll')}
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <div style={emptyStyle(darkMode)}>
          <p style={{ margin: 0 }}>{t('history.empty')}</p>
          <Link to="/" style={{ marginTop: 8, display: 'inline-block', color: darkMode ? '#c9a8ff' : '#6366f1', fontWeight: 600 }}>
            {t('menu.home')} →
          </Link>
        </div>
      ) : (
        <div style={listStyle}>
          {recent.map(item => (
            <div key={item.id} style={itemStyle(darkMode)}>
              <Link to={`/notes/${item.id}`} style={linkStyle(darkMode)}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{item.title}</span>
                <span style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#888' }}>
                  {item.subject} • {item.gradeLevel}
                </span>
                {item.viewedAt && (
                  <span style={{ fontSize: 11, color: darkMode ? '#867aa3' : '#aaa', marginTop: 2 }}>
                    {t('history.visitedOn')} {new Date(item.viewedAt).toLocaleString(locale)}
                  </span>
                )}
              </Link>
              <button
                onClick={() => remove(item.id)}
                aria-label={t('common.delete')}
                style={removeBtnStyle(darkMode)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const listStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 10,
};
const itemStyle = (darkMode) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '12px 14px',
  borderRadius: 10,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.2)' : '1px solid rgba(244, 114, 182, 0.3)',
  background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
  transition: 'background 0.2s ease, border-color 0.2s ease',
});
const linkStyle = (darkMode) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  textDecoration: 'none',
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
  overflow: 'hidden',
  minWidth: 0,
});
const removeBtnStyle = (darkMode) => ({
  background: 'transparent',
  border: 'none',
  color: darkMode ? '#867aa3' : '#aaa',
  cursor: 'pointer',
  fontSize: 16,
  padding: '4px 8px',
  lineHeight: 1,
  flexShrink: 0,
});
const emptyStyle = (darkMode) => ({
  padding: '32px 16px',
  textAlign: 'center',
  color: darkMode ? '#a89bc4' : '#888',
  border: darkMode ? '1px dashed rgba(120, 60, 200, 0.3)' : '1px dashed #d1d5db',
  borderRadius: 12,
});
