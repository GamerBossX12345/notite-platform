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
      <nav style={navStyle}>
        <Link to="/" style={linkStyle}>📚 Notițe</Link>
        <div style={{ flex: 1 }} />
        {user ? (
          <>
            <span>Salut, <strong>{user.name || user.username}</strong></span>
            <Link to="/upload" style={linkStyle}>+ Notiță</Link>
            {user.username === 'Admin' && (
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
const navStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 24px',
  borderBottom: '1px solid #e0e0e0',
  background: '#fafafa',
};

const linkStyle = {
  textDecoration: 'none',
  color: '#333',
};

const buttonStyle = {
  padding: '6px 12px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  background: 'white',
  borderRadius: 4,
};
