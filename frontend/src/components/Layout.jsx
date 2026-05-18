// Layout-ul comun: navbar sus, conținutul paginii dedesubt.
// <Outlet /> e locul unde React Router pune componenta paginii curente.

import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

export default function Layout() {
  const { user, logout, darkMode, updateDarkMode, sidebarOpen, setSidebarOpen, mainMenuOpen, setMainMenuOpen, leaderboardHidden, setLeaderboardHidden } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // Actualizează `<html lang>` ca cititoarele de ecran să anunțe corect limba.
  useEffect(() => {
    document.documentElement.lang = i18n.language?.startsWith('en') ? 'en' : 'ro';
  }, [i18n.language]);

  function toggleLanguage() {
    const next = i18n.language?.startsWith('en') ? 'ro' : 'en';
    i18n.changeLanguage(next);
  }
  // Filtrele au sens doar pe pagina principală (listing-ul de notițe).
  const isHomePage = location.pathname === '/';

  // Accesibilitate: Esc închide drawer-ul/sidebar-ul deschis. Folosit împreună
  // cu aria-* pe drawer pentru screen readers și navigare cu tastatura.
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (mainMenuOpen) setMainMenuOpen(false);
      else if (sidebarOpen) setSidebarOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mainMenuOpen, sidebarOpen, setMainMenuOpen, setSidebarOpen]);

  function handleLogout() {
    logout();
    setMainMenuOpen(false);
    navigate('/');
  }

  async function handleDeleteSelf() {
    if (!confirm(t('settings.deleteAccountConfirm'))) return;
    try {
      await api.delete('/auth/account', { data: { confirm: true } });
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      alert(err.response?.data?.error || t('common.deleteError'));
    }
  }

  function go(path) {
    setMainMenuOpen(false);
    navigate(path);
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HEAD_ADMIN';

  const btnStyle = darkMode
    ? { padding: '6px 12px', cursor: 'pointer', border: '1px solid rgba(150, 80, 255, 0.4)', background: 'rgba(80, 20, 160, 0.3)', borderRadius: 4, color: '#c9a8ff' }
    : { padding: '6px 12px', cursor: 'pointer', border: '1px solid rgba(244, 114, 182, 0.4)', background: 'rgba(244, 114, 182, 0.12)', borderRadius: 4, color: '#be185d' };

  const toggleStyle = darkMode
    ? { ...themeToggleStyle, border: '1px solid rgba(150, 80, 255, 0.3)', background: 'rgba(80, 20, 160, 0.2)' }
    : { ...themeToggleStyle, border: '1px solid rgba(244, 114, 182, 0.4)', background: 'rgba(244, 114, 182, 0.12)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
      {/* Skip-link pentru utilizatorii cu screen reader / navigare la tastatură.
         Vizibil doar la focus (vezi `.skip-link` în index.css). */}
      <a href="#main-content" className="skip-link">{t('common.skipToContent')}</a>
      <nav style={navStyle(darkMode)}>
        {user && (
          <button
            onClick={() => setMainMenuOpen(true)}
            title={t('nav.menu')}
            aria-label={t('nav.openMenu')}
            aria-expanded={mainMenuOpen}
            style={menuToggleStyle(darkMode)}
          >
            ☰
          </button>
        )}
        <Link to="/" style={linkStyle}>📚 {t('common.appName')}</Link>
        <div style={{ flex: 1 }} />
        {user ? (
          user.banned ? (
            <>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>🚫 {t('nav.banned')}</span>
              <Link to="/banned" style={{ ...btnStyle, textDecoration: 'none', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.15)' }}>
                📩 {t('nav.banAppeal')}
              </Link>
              <button onClick={handleDeleteSelf} style={{ ...btnStyle, color: '#fca5a5', border: '1px solid rgba(220, 38, 38, 0.5)', background: 'rgba(220, 38, 38, 0.15)' }}>
                🗑 {t('nav.deleteAccount')}
              </button>
              <button onClick={handleLogout} style={btnStyle}>{t('nav.logout')}</button>
            </>
          ) : (
          <>
            <span>
              {t('nav.greeting')},{' '}
              <Link to={`/profile/${user.username}`} style={{ color: '#c9a8ff', textDecoration: 'none', fontWeight: 600 }}>
                {user.name || user.username}
              </Link>
            </span>
            {isHomePage && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? t('nav.closeFilters') : t('nav.openFilters')}
                style={{ ...btnStyle, padding: '6px 10px' }}
              >
                ☰ {t('nav.filters')}
              </button>
            )}
            <Link to="/saved" style={linkStyle} title={t('nav.savedNotes')} aria-label={t('nav.savedNotes')}>❤️</Link>
            <button onClick={handleLogout} style={btnStyle}>{t('nav.logout')}</button>
          </>
          )
        ) : (
          <>
            <Link to="/login" style={linkStyle}>{t('nav.login')}</Link>
            <Link to="/register" style={linkStyle}>{t('nav.register')}</Link>
          </>
        )}
        <button
          onClick={toggleLanguage}
          title={t('common.language')}
          aria-label={t('common.language')}
          style={{ ...toggleStyle, fontSize: 12, fontWeight: 700 }}
        >
          {i18n.language?.startsWith('en') ? 'EN' : 'RO'}
        </button>
        <button
          onClick={() => updateDarkMode(!darkMode)}
          title={darkMode ? t('nav.darkOn') : t('nav.darkOff')}
          aria-label={darkMode ? t('nav.darkOn') : t('nav.darkOff')}
          aria-pressed={!darkMode}
          style={toggleStyle}
        >
          {darkMode ? '🌙' : '☀️'}
        </button>
      </nav>
      {/* Main menu drawer — randat prin portal direct pe body, ca să scape de
         containing block-ul creat de `backdrop-filter` pe #root. Altfel
         `position: fixed` s-ar ancora la #root (în flux) și ar scrolla cu
         pagina. „Fixed" în sensul că rămâne deschis până la click pe ✕. */}
      {user && mainMenuOpen && createPortal(
        <>
          <div style={menuOverlayStyle} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
            style={menuDrawerStyle(darkMode)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{t('nav.menu')}</h3>
              <button
                onClick={() => setMainMenuOpen(false)}
                aria-label={t('nav.closeMenu')}
                style={menuCloseBtnStyle}
              >✕</button>
            </div>

            <div style={menuSectionStyle}>
              <MenuItem icon="🏠" label={t('menu.home')}        onClick={() => go('/')} />
              <MenuItem icon="🔥" label={t('menu.trending')}    onClick={() => go('/trending')} />
              <MenuItem icon="🙋" label={t('menu.requests')}    onClick={() => go('/requests')} />
              <MenuItem icon="📓" label={t('menu.myNotes')}     onClick={() => go(`/profile/${user.username}`)} />
              <MenuItem icon="❤️" label={t('menu.saved')}        onClick={() => go('/saved')} />
              <MenuItem icon="📖" label={t('menu.history')}     onClick={() => go('/history')} />
              <MenuItem icon="🎴" label={t('menu.flashcards')}  onClick={() => go('/flashcards')} />
              <MenuItem icon="📋" label={t('menu.activity')}    onClick={() => go('/activity')} />
              <MenuItem icon="✏️" label={t('menu.upload')}      onClick={() => go('/upload')} />
              <MenuItem icon="👥" label={t('menu.users')}       onClick={() => go('/users')} />
            </div>

            <div style={{ ...menuSectionStyle, borderTop: '1px solid rgba(120, 60, 200, 0.2)', paddingTop: 12 }}>
              <MenuItem icon="⚙️" label={t('menu.settings')} onClick={() => go('/settings')} />
              {isAdmin && (
                <MenuItem
                  icon="🛡️"
                  label={t('menu.admin')}
                  onClick={() => go('/admin')}
                  color={user.role === 'HEAD_ADMIN' ? '#9333ea' : '#cc6600'}
                />
              )}
              {user.hasBanHistory && !user.banned && (
                <MenuItem icon="📜" label={t('menu.banHistory')} onClick={() => go('/ban-history')} color="#f59e0b" />
              )}
              <MenuItem icon="🚪" label={t('nav.logout')} onClick={handleLogout} color="#dc2626" />
            </div>
          </aside>
        </>,
        document.body
      )}

      {/* Wrapper care conține main + footer-ul sticky. Folosim `flex: 1` ca
         wrapper-ul să umple ecranul pe pagini scurte (footer-ul rămâne pinned
         la jos), iar `sticky bottom: 0` îl ține fixat în viewport cât scrollezi
         prin main; când scrollezi în secțiunea de detalii (în afara wrapper-ului),
         footer-ul se „eliberează" și urcă natural cu pagina. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <main id="main-content" tabIndex={-1} style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 24px', position: 'relative', zIndex: 2, width: '100%', boxSizing: 'border-box', flex: 1 }}>
          <Outlet />
        </main>
        <footer style={footerStyle(darkMode)}>
          {user && !user.banned && (
            <Link
              to="/upload"
              title={t('nav.addNote')}
              aria-label={t('nav.addNote')}
              style={{ ...toggleStyle, textDecoration: 'none' }}
            >
              {/* SVG cu cele două linii — perfect centrat geometric. „+" ca text
                 e împins vizual mai sus de metricile fontului. */}
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ display: 'block' }}>
                <path
                  d="M8 2.5v11M2.5 8h11"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          )}
          <div style={{ flex: 1 }} />
          {user && (
            <button
              onClick={() => setLeaderboardHidden(!leaderboardHidden)}
              title={leaderboardHidden ? t('nav.showLeaderboard') : t('nav.hideLeaderboard')}
              aria-label={leaderboardHidden ? t('nav.showLeaderboard') : t('nav.hideLeaderboard')}
              aria-pressed={leaderboardHidden}
              style={leaderboardHidden
                ? { ...themeToggleStyle, border: '1px solid rgba(220, 38, 38, 0.55)', background: 'rgba(220, 38, 38, 0.25)', color: '#fca5a5' }
                : toggleStyle}
            >
              🏆
            </button>
          )}
        </footer>
      </div>

      <SiteDetails darkMode={darkMode} />
    </div>
  );
}

function SiteDetails({ darkMode }) {
  const { t } = useTranslation();
  return (
    <section style={siteDetailsStyle(darkMode)}>
      <div style={siteDetailsInner}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 24 }}>
          <div>
            <h3 style={detailsTitleStyle}>📚 {t('common.appName')}</h3>
            <p style={detailsTextStyle(darkMode)}>{t('footerInfo.tagline')}</p>
          </div>
          <div>
            <h3 style={detailsTitleStyle}>{t('footerInfo.features')}</h3>
            <ul style={detailsListStyle(darkMode)}>
              <li>{t('footerInfo.feature1')}</li>
              <li>{t('footerInfo.feature2')}</li>
              <li>{t('footerInfo.feature3')}</li>
              <li>{t('footerInfo.feature4')}</li>
            </ul>
          </div>
          <div>
            <h3 style={detailsTitleStyle}>{t('footerInfo.community')}</h3>
            <ul style={detailsListStyle(darkMode)}>
              <li><Link to="/users" style={detailsLinkStyle(darkMode)}>{t('menu.users')}</Link></li>
              <li><Link to="/trending" style={detailsLinkStyle(darkMode)}>{t('menu.trending')}</Link></li>
              <li><Link to="/requests" style={detailsLinkStyle(darkMode)}>{t('menu.requests')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 style={detailsTitleStyle}>{t('footerInfo.rules')}</h3>
            <ul style={detailsListStyle(darkMode)}>
              <li><Link to="/rules" style={detailsLinkStyle(darkMode)}>{t('footerInfo.regulation')}</Link></li>
              <li><Link to="/appeals/public" style={detailsLinkStyle(darkMode)}>{t('footerInfo.publicAppeals')}</Link></li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: darkMode ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid rgba(244, 114, 182, 0.25)', paddingTop: 12, fontSize: 12, color: darkMode ? '#a89bc4' : '#9ca3af', textAlign: 'center' }}>
          {new Date().getFullYear()} {t('common.appName')} • {t('common.footer')}
        </div>
      </div>
    </section>
  );
}

function MenuItem({ icon, label, onClick, color }) {
  return (
    <button onClick={onClick} style={{ ...menuItemStyle, color: color || 'inherit' }}>
      <span style={{ width: 22, textAlign: 'center', fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
    </button>
  );
}

// TODO: mută stilurile într-un fișier .css sau folosește o bibliotecă (ex: CSS modules).
// Inline styles sunt OK pentru skeleton, dar prost pentru proiect mare.
// Header — translucid + blur, pereche cu footer-ul. Paleta diferă pe teme:
// mov-inchis în dark, roz-pastel în light.
const navStyle = (darkMode) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 24px',
  borderBottom: darkMode
    ? '1px solid rgba(120, 60, 200, 0.3)'
    : '1px solid rgba(244, 114, 182, 0.35)',
  background: darkMode
    ? 'rgba(20, 8, 50, 0.5)'
    : 'rgba(255, 240, 248, 0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
});

const footerStyle = (darkMode) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 24px',
  borderTop: darkMode
    ? '1px solid rgba(120, 60, 200, 0.3)'
    : '1px solid rgba(244, 114, 182, 0.35)',
  background: darkMode
    ? 'rgba(20, 8, 50, 0.5)'
    : 'rgba(255, 240, 248, 0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  position: 'sticky',
  bottom: 0,
  zIndex: 100,
});

// Secțiunea de detalii — apare sub footer-ul sticky. Cât scrollezi prin main,
// footer-ul stă pinned la viewport bottom. Când ieși din wrapper-ul main+footer
// (scrollezi în acest section), sticky se „eliberează" și footer-ul urcă cu
// pagina, dezvăluind detaliile. Aceeași culoare ca footer-ul pentru continuitate.
const siteDetailsStyle = (darkMode) => ({
  position: 'relative',
  zIndex: 2,
  background: darkMode
    ? 'rgba(20, 8, 50, 0.5)'
    : 'rgba(255, 240, 248, 0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderTop: darkMode
    ? '1px solid rgba(120, 60, 200, 0.2)'
    : '1px solid rgba(244, 114, 182, 0.25)',
  color: darkMode ? '#d4c8ff' : '#374151',
});
const siteDetailsInner = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '32px 24px 24px',
};
const detailsTitleStyle = {
  margin: '0 0 8px', fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
  textTransform: 'uppercase',
};
const detailsTextStyle = (darkMode) => ({
  margin: 0, fontSize: 13, lineHeight: 1.55,
  color: darkMode ? '#c9bee0' : '#4b5563',
});
const detailsListStyle = (darkMode) => ({
  listStyle: 'none', padding: 0, margin: 0,
  fontSize: 13, lineHeight: 1.8,
  color: darkMode ? '#c9bee0' : '#4b5563',
});
const detailsLinkStyle = (darkMode) => ({
  color: darkMode ? '#c9a8ff' : '#be185d',
  textDecoration: 'none', fontWeight: 500,
});

const linkStyle = {
  textDecoration: 'none',
  color: '#c9a8ff',
};

const themeToggleStyle = {
  width: 34,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  border: '1px solid rgba(150, 80, 255, 0.3)',
  background: 'rgba(80, 20, 160, 0.2)',
  borderRadius: '50%',
  fontSize: 16,
  lineHeight: 1,
  transition: 'background 0.2s',
};

const menuToggleStyle = (darkMode) => ({
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, cursor: 'pointer', borderRadius: 6, fontSize: 18, lineHeight: 1,
  border: darkMode ? '1px solid rgba(150, 80, 255, 0.4)' : '1px solid rgba(244, 114, 182, 0.4)',
  background: darkMode ? 'rgba(80, 20, 160, 0.3)' : 'rgba(244, 114, 182, 0.12)',
  color: darkMode ? '#c9a8ff' : '#be185d',
});

const menuOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0, 0, 0, 0.4)', zIndex: 200,
};
const menuDrawerStyle = (darkMode) => ({
  position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : 'rgba(255, 255, 255, 0.97)',
  backdropFilter: 'blur(14px)',
  borderRight: '1px solid rgba(120, 60, 200, 0.3)',
  padding: 20, zIndex: 201, overflowY: 'auto',
  boxShadow: '4px 0 24px rgba(0, 0, 0, 0.25)',
  color: darkMode ? '#e8e0ff' : '#222',
});
const menuCloseBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 18, color: 'inherit', padding: 4, opacity: 0.7,
};
const menuSectionStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12,
};
const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 12px', borderRadius: 6,
  background: 'transparent', border: 'none',
  cursor: 'pointer', fontSize: 14, fontWeight: 500,
  width: '100%', textAlign: 'left',
};
