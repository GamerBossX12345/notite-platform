import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFlipAnimation } from '../hooks/useFlipAnimation.js';
import { TeacherBadge } from '../components/Badges.jsx';

const ROLE_BADGE = {
  HEAD_ADMIN: { label: 'Head Admin', color: '#7c3aed' },
  ADMIN:      { label: 'Admin',      color: '#f59e0b' },
};

const MEDAL_STYLES = [
  { background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)', border: '1px solid #d97706', shadow: '0 4px 14px rgba(251, 191, 36, 0.45)', text: '#5b3a00', icon: '🥇' },
  { background: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)', border: '1px solid #6b7280', shadow: '0 4px 14px rgba(156, 163, 175, 0.45)', text: '#1f2937', icon: '🥈' },
  { background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', border: '1px solid #78350f', shadow: '0 4px 14px rgba(146, 64, 14, 0.45)', text: '#fef3c7', icon: '🥉' },
];

export default function UsersPage() {
  const { darkMode } = useAuth();
  const { t } = useTranslation();
  const SORT_OPTIONS = [
    { value: 'reputation', label: t('users.reputation') },
    { value: 'notes',      label: t('users.notes') },
    { value: 'username',   label: t('common.username') },
    { value: 'recent',     label: t('users.joined') },
  ];
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('reputation');
  const [showAdmins, setShowAdmins] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { setPage(1); }, [searchInput, sort, showAdmins]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      api.get('/auth/users', {
        params: {
          q: searchInput.trim() || undefined,
          sort,
          page,
          pageSize: 24,
          adminsOnly: showAdmins ? 'true' : undefined,
        },
      })
        .then(res => setData(res.data))
        .catch(err => setError(err.response?.data?.error || err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, sort, showAdmins, page]);

  const gridRef = useFlipAnimation([sort, showAdmins, page, data.users]);
  const showMedals = sort === 'notes' && page === 1 && !showAdmins;

  return (
    <div>
      <h1 style={{ marginBottom: 28 }}>{t('users.title')}</h1>

      <div style={filterBarStyle}>
        <input
          type="search"
          placeholder={t('users.searchPlaceholder')}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)} style={inputStyle}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={() => setShowAdmins(s => !s)}
          style={adminToggleStyle(showAdmins)}
        >
          👑 {t('users.filterAdmins')}
        </button>
      </div>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p style={{ color: 'red' }}>{t('common.error')}: {error}</p>}

      {!loading && !error && (
        <>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 14 }}>
            {data.total}
          </p>

          {data.users.length === 0 ? (
            <p>{t('users.noUsers')}</p>
          ) : (
            <div ref={gridRef} style={gridStyle}>
              {data.users.map((u, idx) => {
                const displayName = u.showName && u.name ? u.name : `@${u.username}`;
                const badge = showAdmins ? ROLE_BADGE[u.role] : null;
                const isHead = showAdmins && u.role === 'HEAD_ADMIN';
                const crown = isHead && idx === 0 ? '👑 ' : '';
                const medal = showMedals && idx < 3 ? MEDAL_STYLES[idx] : null;
                return (
                  <Link key={u.id} data-flip-id={u.id} to={`/profile/${u.username}`} style={cardLinkStyle}>
                    <div style={medal ? medalCardStyle(medal) : cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 15, color: medal ? medal.text : 'inherit', display: 'inline-flex', alignItems: 'center' }}>
                          {medal && <span style={{ marginRight: 6 }}>{medal.icon}</span>}
                          {crown}{displayName}
                          {u.isTeacher && <TeacherBadge size={14} />}
                        </h3>
                        {badge && (
                          <span style={{ ...badgeStyle, background: badge.color, color: u.role === 'ADMIN' ? '#3b2a00' : 'white' }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {u.showName && u.name && (
                        <p style={{ ...subtleStyle, color: medal ? medal.text : '#888', opacity: medal ? 0.85 : 1 }}>@{u.username}</p>
                      )}
                      {(u.school || u.grade) && (
                        <p style={{ ...metaStyle, color: medal ? medal.text : '#aaa', opacity: medal ? 0.85 : 1 }}>
                          {[u.school, u.grade ? `${t('common.grade')} ${u.grade}` : null].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: medal ? medal.text : '#888', fontWeight: medal ? 600 : 400 }}>
                        ⭐ {u.reputation} • 📓 {u._count.notes}
                        {showAdmins && (u.role === 'ADMIN' || u.role === 'HEAD_ADMIN') && (
                          <> • 🛡️ {u._count.actionedReports || 0}</>
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {data.totalPages > 1 && (
            <div style={paginationStyle}>
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} style={pageBtnStyle(darkMode)}>‹ {t('common.previous')}</button>
              <span style={{ padding: '6px 12px', color: '#888', fontSize: 14 }}>
                {page} / {data.totalPages}
              </span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} style={pageBtnStyle(darkMode)}>{t('common.next')} ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const filterBarStyle = { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' };
const inputStyle = {
  padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6,
  fontSize: 14, background: 'transparent', color: 'inherit',
};
const adminToggleStyle = (active) => ({
  padding: '8px 14px', borderRadius: 6, fontSize: 14, cursor: 'pointer',
  border: active ? '1px solid rgba(168, 85, 247, 0.7)' : '1px solid rgba(168, 85, 247, 0.35)',
  background: active ? 'rgba(120, 40, 200, 0.25)' : 'transparent',
  color: active ? '#c9a8ff' : 'inherit',
  fontWeight: active ? 600 : 400,
  whiteSpace: 'nowrap',
  transition: 'background 0.2s ease, border-color 0.2s ease',
});
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 14,
};
const cardLinkStyle = { textDecoration: 'none', color: 'inherit' };
const cardStyle = {
  padding: 14,
  border: '1px solid rgba(120, 60, 200, 0.18)',
  borderRadius: 10,
  background: 'rgba(255, 255, 255, 0.04)',
  transition: 'border-color 0.2s, background 0.2s',
};
const medalCardStyle = (m) => ({
  padding: 14,
  border: m.border,
  borderRadius: 10,
  background: m.background,
  boxShadow: m.shadow,
  color: m.text,
});
const subtleStyle = { margin: '4px 0 0', fontSize: 12 };
const metaStyle = { margin: '6px 0 0', fontSize: 12 };
const badgeStyle = {
  fontSize: 10, padding: '2px 7px', borderRadius: 10,
  color: 'white', fontWeight: 600, whiteSpace: 'nowrap',
};
const paginationStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 8, marginTop: 24,
};
const pageBtnStyle = {
  padding: '6px 14px', border: '1px solid #ccc', borderRadius: 4,
  background: 'transparent', cursor: 'pointer', color: 'inherit',
};
