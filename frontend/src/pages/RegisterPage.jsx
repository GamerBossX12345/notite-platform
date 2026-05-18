import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ALL_SUBJECTS, subjectsForGrade } from '../data/subjects.js';

const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

export default function RegisterPage() {
  const { register, darkMode } = useAuth();
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

  // Materiile disponibile depind de clasa aleasă. Cât timp nu există clasă,
  // afișăm lista completă (toate materiile sunt selectabile).
  const availableSubjects = useMemo(
    () => (grade ? subjectsForGrade(grade) : ALL_SUBJECTS),
    [grade]
  );

  // Dacă userul schimbă clasa și materia preferată curentă nu mai e validă
  // pentru noua clasă, resetăm selecția ca să nu rămână o valoare invizibilă.
  useEffect(() => {
    if (defaultSubject && !availableSubjects.includes(defaultSubject)) {
      setDefaultSubject('');
    }
  }, [availableSubjects, defaultSubject]);

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
      <div style={{ maxWidth: 480, margin: '64px auto', textAlign: 'center' }}>
        <div style={cardStyle(darkMode)}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
          <h2 style={{ marginTop: 0 }}>Verifică-ți emailul</h2>
          <p>Ți-am trimis un link de confirmare la <strong>{email}</strong>.</p>
          <p style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#666' }}>
            Linkul expiră în 24 de ore. Verifică și folderul spam dacă nu îl găsești.
          </p>
          <Link to="/login" style={{ color: darkMode ? '#c9a8ff' : '#be185d', fontWeight: 600, textDecoration: 'none' }}>
            ← Înapoi la login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1 style={{ marginTop: 0, marginBottom: 40 }}>Înregistrare</h1>

      <div style={cardStyle(darkMode)}>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle(darkMode)}>
            Nume și prenume
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              required autoComplete="name" style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            Email
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            Username
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              required minLength={3} style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            Parolă <span style={hintStyle(darkMode)}>(minim 8 caractere)</span>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            Confirmă parola
            <input
              type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required minLength={8}
              style={{
                ...inputStyle(darkMode),
                ...(confirmPassword && password !== confirmPassword
                  ? { border: '1px solid #dc3545' }
                  : null),
              }}
            />
            {confirmPassword && password !== confirmPassword && (
              <span style={{ color: '#dc3545', fontSize: 12 }}>Parolele nu coincid</span>
            )}
          </label>
          <label style={labelStyle(darkMode)}>
            Școala <span style={hintStyle(darkMode)}>(opțional)</span>
            <input
              type="text" value={school} onChange={(e) => setSchool(e.target.value)}
              placeholder="ex: Colegiul Național..." style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            Clasa <span style={hintStyle(darkMode)}>(opțional)</span>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} style={inputStyle(darkMode)}>
              <option value="">— nu specifica —</option>
              {GRADE_LEVELS.map(g => (
                <option key={g} value={g}>a {g}-a</option>
              ))}
            </select>
          </label>
          <label style={labelStyle(darkMode)}>
            Materie preferată <span style={hintStyle(darkMode)}>(opțional)</span>
            <select value={defaultSubject} onChange={(e) => setDefaultSubject(e.target.value)} style={inputStyle(darkMode)}>
              <option value="">— nu specifica —</option>
              {availableSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span style={{ ...hintStyle(darkMode), display: 'block', marginTop: 4 }}>
              {grade
                ? `Doar materiile predate la clasa a ${grade}-a. Va fi filtrul implicit pe pagina principală — o poți schimba oricând din Setări.`
                : 'Va fi filtrul implicit pe pagina principală. O poți schimba oricând din Setări.'}
            </span>
          </label>
          {error && <p style={errorStyle(darkMode)}>❌ {error}</p>}
          <button type="submit" disabled={submitting} style={buttonStyle(darkMode, submitting)}>
            {submitting ? 'Se trimite...' : 'Creează cont'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 16, textAlign: 'center', color: darkMode ? '#a89bc4' : '#666' }}>
        Ai deja cont?{' '}
        <Link to="/login" style={{ color: darkMode ? '#c9a8ff' : '#be185d', fontWeight: 600 }}>
          Login
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
const hintStyle = (darkMode) => ({
  color: darkMode ? '#a89bc4' : '#888',
  fontWeight: 400, fontSize: 12,
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
