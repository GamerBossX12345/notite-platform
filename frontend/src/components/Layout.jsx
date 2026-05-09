// Layout-ul comun: navbar sus, conținutul paginii dedesubt.
// <Outlet /> e locul unde React Router pune componenta paginii curente.

import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div>
      <div style={orb1Style} />
      <div style={orb2Style} />
      <div style={orb3Style} />
      <nav style={navStyle}>
        <Link to="/" style={linkStyle}>📚 Notițe</Link>
        <div style={{ flex: 1 }} />
        {user ? (
          <>
            <span>Salut, <strong>{user.name || user.username}</strong></span>
            <Link to="/upload" style={linkStyle}>+ Notiță</Link>
            <Link to="/settings" style={linkStyle}>Setări</Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" style={{ ...linkStyle, color: '#cc6600' }}>⚙ Admin</Link>
            )}
            <button onClick={handleLogout} style={buttonStyle}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={linkStyle}>Login</Link>
            <Link to="/register" style={linkStyle}>Înregistrare</Link>
          </>
        )}
      </nav>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
  <Outlet />
</main>
    </div>
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

const orb1Style = {
  ...orbBase,
  width: 340,
  height: 240,
  top: '30%',
  left: '5%',
  background: 'rgba(110, 30, 220, 0.55)',
  animation: 'orbPulse1 7s ease-in-out infinite',
};

const orb2Style = {
  ...orbBase,
  width: 280,
  height: 200,
  top: '10%',
  right: '8%',
  background: 'rgba(30, 60, 210, 0.5)',
  animation: 'orbPulse2 10s ease-in-out infinite',
};

const orb3Style = {
  ...orbBase,
  width: 260,
  height: 200,
  bottom: '15%',
  right: '20%',
  background: 'rgba(80, 10, 180, 0.45)',
  animation: 'orbPulse3 8s ease-in-out infinite',
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

const buttonStyle = {
  padding: '6px 12px',
  cursor: 'pointer',
  border: '1px solid rgba(150, 80, 255, 0.4)',
  background: 'rgba(80, 20, 160, 0.3)',
  borderRadius: 4,
  color: '#c9a8ff',
};
