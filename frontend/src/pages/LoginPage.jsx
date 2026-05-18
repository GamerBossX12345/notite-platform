import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function LoginPage() {
  const { login, darkMode } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [deviceNotice, setDeviceNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setDeviceNotice(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'DEVICE_VERIFICATION_REQUIRED') {
        setDeviceNotice({
          message: data.error || 'Acces de pe dispozitiv nou. Verifică-ți emailul.',
          email: data.email,
        });
      } else {
        setError(data?.error || 'Eroare la autentificare');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1 style={{ marginTop: 0, marginBottom: 40 }}>Login</h1>

      <div style={cardStyle(darkMode)}>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle(darkMode)}>
            Email sau username
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            Parolă
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle(darkMode)}
            />
          </label>
          {error && <p style={errorStyle(darkMode)}>❌ {error}</p>}
          {deviceNotice && (
            <div style={noticeStyle(darkMode)}>
              <strong>📩 Verificare dispozitiv necesară</strong>
              <p style={{ margin: '6px 0 0' }}>
                {deviceNotice.message}
                {deviceNotice.email && (
                  <> Am trimis un link la <strong>{deviceNotice.email}</strong>.</>
                )}
              </p>
            </div>
          )}
          <button type="submit" disabled={submitting} style={buttonStyle(darkMode, submitting)}>
            {submitting ? 'Se trimite...' : 'Intră în cont'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 16, textAlign: 'center', color: darkMode ? '#a89bc4' : '#666' }}>
        Nu ai cont?{' '}
        <Link to="/register" style={{ color: darkMode ? '#c9a8ff' : '#be185d', fontWeight: 600 }}>
          Înregistrează-te
        </Link>
      </p>
    </div>
  );
}

// ── Stiluri (alineate cu sidebar-ul de filtre / SettingsPage) ────────────────
const cardStyle = (darkMode) => ({
  padding: 24, borderRadius: 12,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.3)' : '1px solid rgba(244, 114, 182, 0.35)',
  background: darkMode ? 'rgba(20, 8, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: darkMode
    ? '0 8px 24px rgba(80, 20, 160, 0.2)'
    : '0 8px 24px rgba(0, 0, 0, 0.08)',
});
const labelStyle = (darkMode) => ({
  display: 'block', marginBottom: 14, fontWeight: 500, fontSize: 14,
  color: darkMode ? '#d4c8ff' : '#1a1a1a',
});
const inputStyle = (darkMode) => ({
  display: 'block', width: '100%', padding: 10, marginTop: 6,
  boxSizing: 'border-box',
  background: darkMode ? 'rgba(0, 0, 0, 0.3)' : '#fff',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(244, 114, 182, 0.4)',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 6, fontSize: 14,
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});
const buttonStyle = (darkMode, disabled) => ({
  width: '100%', marginTop: 8, padding: '11px 20px',
  background: darkMode
    ? 'rgba(120, 40, 200, 0.7)'
    : 'linear-gradient(135deg, #f472b6 0%, #22d3ee 100%)',
  color: 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
  borderRadius: 6,
  cursor: disabled ? 'wait' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  fontSize: 15, fontWeight: 600,
});
const errorStyle = (darkMode) => ({
  color: darkMode ? '#fca5a5' : '#b91c1c',
  fontSize: 14, marginBottom: 12,
});
const noticeStyle = (darkMode) => ({
  padding: 12, marginBottom: 12, borderRadius: 8,
  background: darkMode ? 'rgba(251, 146, 60, 0.12)' : '#fff7ed',
  border: darkMode ? '1px solid rgba(251, 146, 60, 0.5)' : '1px solid #fdba74',
  color: darkMode ? '#fdba74' : '#9a3412',
  fontSize: 14,
});
