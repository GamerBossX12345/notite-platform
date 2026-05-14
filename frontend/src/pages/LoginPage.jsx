import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function LoginPage() {
  const { login } = useAuth();
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
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>
          Email sau username
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Parolă
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {deviceNotice && (
          <div style={noticeStyle}>
            <strong>📩 Verificare dispozitiv necesară</strong>
            <p style={{ margin: '6px 0 0' }}>
              {deviceNotice.message}
              {deviceNotice.email && (
                <> Am trimis un link la <strong>{deviceNotice.email}</strong>.</>
              )}
            </p>
          </div>
        )}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Se trimite...' : 'Intră în cont'}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        Nu ai cont? <Link to="/register">Înregistrează-te</Link>
      </p>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: 12 };
const inputStyle = {
  display: 'block',
  width: '100%',
  padding: 8,
  marginTop: 4,
  border: '1px solid #ccc',
  borderRadius: 4,
};
const buttonStyle = {
  padding: '10px 20px',
  background: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
const noticeStyle = {
  padding: 12,
  background: '#fff7ed',
  border: '1px solid #fdba74',
  borderRadius: 6,
  color: '#9a3412',
  fontSize: 14,
  marginBottom: 12,
};
