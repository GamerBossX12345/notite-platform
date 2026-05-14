// Layout-ul comun: navbar sus, conținutul paginii dedesubt.
// <Outlet /> e locul unde React Router pune componenta paginii curente.

import { Outlet, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

export default function Layout() {
  const { user, logout, darkMode, updateDarkMode, sidebarOpen, setSidebarOpen, mainMenuOpen, setMainMenuOpen } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setMainMenuOpen(false);
    navigate('/');
  }

  async function handleDeleteSelf() {
    if (!confirm('Sigur vrei să ștergi definitiv contul? Acțiunea este ireversibilă.')) return;
    try {
      await api.delete('/auth/account', { data: { confirm: true } });
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la ștergere');
    }
  }

  function go(path) {
    setMainMenuOpen(false);
    navigate(path);
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HEAD_ADMIN';

  const orb1 = darkMode
    ? { ...orbBase, width: 340, height: 240, top: '30%', left: '5%', background: 'rgba(110, 30, 220, 0.55)', animation: 'orbPulse1 7s ease-in-out infinite' }
    : { ...orbBase, width: 340, height: 240, top: '30%', left: '5%', background: 'rgba(255, 100, 180, 0.30)', animation: 'orbPulse1 7s ease-in-out infinite' };

  const orb2 = darkMode
    ? { ...orbBase, width: 280, height: 200, top: '10%', right: '8%', background: 'rgba(30, 60, 210, 0.5)', animation: 'orbPulse2 10s ease-in-out infinite' }
    : { ...orbBase, width: 280, height: 200, top: '10%', right: '8%', background: 'rgba(0, 200, 210, 0.25)', animation: 'orbPulse2 10s ease-in-out infinite' };

  const orb3 = darkMode
    ? { ...orbBase, width: 260, height: 200, bottom: '15%', right: '20%', background: 'rgba(80, 10, 180, 0.45)', animation: 'orbPulse3 8s ease-in-out infinite' }
    : { ...orbBase, width: 260, height: 200, bottom: '15%', right: '20%', background: 'rgba(255, 80, 160, 0.22)', animation: 'orbPulse3 8s ease-in-out infinite' };

  const btnStyle = darkMode
    ? { padding: '6px 12px', cursor: 'pointer', border: '1px solid rgba(150, 80, 255, 0.4)', background: 'rgba(80, 20, 160, 0.3)', borderRadius: 4, color: '#c9a8ff' }
    : { padding: '6px 12px', cursor: 'pointer', border: '1px solid rgba(244, 114, 182, 0.4)', background: 'rgba(244, 114, 182, 0.12)', borderRadius: 4, color: '#be185d' };

  const toggleStyle = darkMode
    ? { ...themeToggleStyle, border: '1px solid rgba(150, 80, 255, 0.3)', background: 'rgba(80, 20, 160, 0.2)' }
    : { ...themeToggleStyle, border: '1px solid rgba(244, 114, 182, 0.4)', background: 'rgba(244, 114, 182, 0.12)' };

  return (
    <div>
      <div style={orb1} />
      <div style={orb2} />
      <div style={orb3} />
      <nav style={navStyle}>
        {user && (
          <button
            onClick={() => setMainMenuOpen(true)}
            title="Meniu"
            style={menuToggleStyle(darkMode)}
          >
            ☰
          </button>
        )}
        <Link to="/" style={linkStyle}>📚 Notițe</Link>
        <div style={{ flex: 1 }} />
        {user ? (
          user.banned ? (
            <>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>🚫 Cont banat</span>
              <Link to="/banned" style={{ ...btnStyle, textDecoration: 'none', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.15)' }}>
                📩 Cerere de unban
              </Link>
              <button onClick={handleDeleteSelf} style={{ ...btnStyle, color: '#fca5a5', border: '1px solid rgba(220, 38, 38, 0.5)', background: 'rgba(220, 38, 38, 0.15)' }}>
                🗑 Șterge contul
              </button>
              <button onClick={handleLogout} style={btnStyle}>Logout</button>
            </>
          ) : (
          <>
            <span>
              Salut,{' '}
              <Link to={`/profile/${user.username}`} style={{ color: '#c9a8ff', textDecoration: 'none', fontWeight: 600 }}>
                {user.name || user.username}
              </Link>
            </span>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Închide bara laterală' : 'Deschide bara laterală'}
              style={{ ...btnStyle, padding: '6px 10px' }}
            >
              ☰ Filtre
            </button>
            <Link to="/upload" style={linkStyle}>+ Notiță</Link>
            <Link to="/saved" style={linkStyle} title="Notițe salvate">❤️</Link>
            <Link to="/settings" style={linkStyle}>Setări</Link>
            {(user.role === 'ADMIN' || user.role === 'HEAD_ADMIN') && (
              <Link to="/admin" style={{ ...linkStyle, color: user.role === 'HEAD_ADMIN' ? '#9333ea' : '#cc6600' }}>⚙ Admin</Link>
            )}
            <button onClick={handleLogout} style={btnStyle}>Logout</button>
          </>
          )
        ) : (
          <>
            <Link to="/login" style={linkStyle}>Login</Link>
            <Link to="/register" style={linkStyle}>Înregistrare</Link>
          </>
        )}
        <button
          onClick={() => updateDarkMode(!darkMode)}
          title={darkMode ? 'Treci la modul luminos' : 'Treci la modul întunecat'}
          style={toggleStyle}
        >
          {darkMode ? '🌙' : '☀️'}
        </button>
      </nav>
      {/* Main menu drawer */}
      {user && mainMenuOpen && (
        <>
          <div onClick={() => setMainMenuOpen(false)} style={menuOverlayStyle} />
          <aside style={menuDrawerStyle(darkMode)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Meniu</h3>
              <button onClick={() => setMainMenuOpen(false)} style={menuCloseBtnStyle}>✕</button>
            </div>

            <div style={menuSectionStyle}>
              <MenuItem icon="🏠" label="Acasă"           onClick={() => go('/')} />
              <MenuItem icon="🔥" label="În tendințe"      onClick={() => go('/trending')} />
              <MenuItem icon="🙋" label="Cereri de notițe" onClick={() => go('/requests')} />
              <MenuItem icon="📓" label="Notițele mele"    onClick={() => go(`/profile/${user.username}`)} />
              <MenuItem icon="❤️" label="Salvate"           onClick={() => go('/saved')} />
              <MenuItem icon="🎴" label="Flashcards"        onClick={() => go('/flashcards')} />
              <MenuItem icon="📋" label="Activitate cont"  onClick={() => go('/activity')} />
              <MenuItem icon="📜" label="Apeluri publice"  onClick={() => go('/appeals/public')} />
              <MenuItem icon="✏️" label="Adaugă notiță"   onClick={() => go('/upload')} />
              <MenuItem icon="👥" label="Toți utilizatorii" onClick={() => go('/users')} />
            </div>

            <div style={{ ...menuSectionStyle, borderTop: '1px solid rgba(120, 60, 200, 0.2)', paddingTop: 12 }}>
              <MenuItem icon="⚙️" label="Setări" onClick={() => go('/settings')} />
              {isAdmin && (
                <MenuItem
                  icon="🛡️"
                  label="Panou admin"
                  onClick={() => go('/admin')}
                  color={user.role === 'HEAD_ADMIN' ? '#9333ea' : '#cc6600'}
                />
              )}
              {user.hasBanHistory && !user.banned && (
                <MenuItem icon="📜" label="Istoric ban" onClick={() => go('/ban-history')} color="#f59e0b" />
              )}
              <MenuItem icon="🚪" label="Logout" onClick={handleLogout} color="#dc2626" />
            </div>
          </aside>
        </>
      )}

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <Outlet />
      </main>
    </div>
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
const orbBase = {
  position: 'fixed',
  borderRadius: '50%',
  pointerEvents: 'none',
  zIndex: 0,
  filter: 'blur(60px)',
};

const navStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 24px',
  borderBottom: '1px solid rgba(120, 60, 200, 0.3)',
  background: 'rgba(20, 8, 50, 0.5)',
  backdropFilter: 'blur(12px)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

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
