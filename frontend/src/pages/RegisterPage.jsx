import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);
const SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [username, setUsername]             = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [school, setSchool]                 = useState('');
  const [grade, setGrade]                   = useState('');
  const [defaultSubject, setDefaultSubject] = useState('');
  const [error, setError]                   = useState(null);
  const [submitting, setSubmitting]         = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }

    setSubmitting(true);
    try {
      const result = await register(email, username, password, name, school, grade, defaultSubject);
      if (result?.requiresVerification) {
        setVerificationSent(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la înregistrare');
    } finally {
      setSubmitting(false);
    }
  }

  if (verificationSent) {
    return (
      <div style={{ maxWidth: 480, margin: '64px auto', textAlign: 'center', padding: 24 }}>
        <div style={{ padding: 32, borderRadius: 12, border: '1px solid rgba(168, 85, 247, 0.35)', background: 'rgba(20, 8, 50, 0.4)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
          <h2 style={{ marginTop: 0 }}>Verifică-ți emailul</h2>
          <p>Ți-am trimis un link de confirmare la <strong>{email}</strong>.</p>
          <p style={{ fontSize: 13, color: '#a89bc4' }}>
            Linkul expiră în 24 de ore. Verifică și folderul spam dacă nu îl găsești.
          </p>
          <Link to="/login" style={{ color: '#c9a8ff', textDecoration: 'none' }}>
            ← Înapoi la login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Înregistrare</h1>
      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>
          Nume și prenume
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Parolă (minim 8 caractere)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Confirmă parola
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{
              ...inputStyle,
              borderColor: confirmPassword && password !== confirmPassword ? '#dc3545' : '#ccc',
            }}
          />
          {confirmPassword && password !== confirmPassword && (
            <span style={{ color: '#dc3545', fontSize: 12 }}>Parolele nu coincid</span>
          )}
        </label>
        <label style={labelStyle}>
          Școala <span style={{ color: '#888', fontWeight: 400 }}>(opțional)</span>
          <input
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="ex: Colegiul Național..."
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Clasa <span style={{ color: '#888', fontWeight: 400 }}>(opțional)</span>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} style={inputStyle}>
            <option value="">— nu specifica —</option>
            {GRADE_LEVELS.map(g => (
              <option key={g} value={g}>a {g}-a</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Materie preferată <span style={{ color: '#888', fontWeight: 400 }}>(opțional)</span>
          <select value={defaultSubject} onChange={(e) => setDefaultSubject(e.target.value)} style={inputStyle}>
            <option value="">— nu specifica —</option>
            {SUBJECTS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span style={{ color: '#888', fontSize: 12 }}>
            Va fi filtrul implicit pe pagina principală. O poți schimba oricând din Setări.
          </span>
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Se trimite...' : 'Creează cont'}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        Ai deja cont? <Link to="/login">Login</Link>
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
  boxSizing: 'border-box',
};
const buttonStyle = {
  padding: '10px 20px',
  background: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
