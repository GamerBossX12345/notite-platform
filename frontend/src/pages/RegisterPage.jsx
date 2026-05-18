import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { ALL_SUBJECTS, subjectsForGrade } from '../data/subjects.js';

const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

export default function RegisterPage() {
  const { register, darkMode } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      setError(t('auth.registerError') + ': ' + t('common.password'));
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
      setError(err.response?.data?.error || t('auth.registerError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (verificationSent) {
    return (
      <div style={{ maxWidth: 480, margin: '64px auto', textAlign: 'center' }}>
        <div style={cardStyle(darkMode)}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
          <h2 style={{ marginTop: 0 }}>{t('auth.emailVerificationTitle')}</h2>
          <p>{t('auth.registerSuccess')}</p>
          <p><strong>{email}</strong></p>
          <Link to="/login" style={{ color: darkMode ? '#c9a8ff' : '#be185d', fontWeight: 600, textDecoration: 'none' }}>
            ← {t('auth.goToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1 style={{ marginTop: 0, marginBottom: 40 }}>{t('auth.registerTitle')}</h1>

      <div style={cardStyle(darkMode)}>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle(darkMode)}>
            {t('auth.fullName')}
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              required autoComplete="name" style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            {t('common.email')}
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            {t('common.username')}
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              required minLength={3} style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            {t('common.password')} <span style={hintStyle(darkMode)}>({t('auth.passwordRules')})</span>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            {t('common.confirm')} {t('common.password')}
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
          </label>
          <label style={labelStyle(darkMode)}>
            {t('auth.school')}
            <input
              type="text" value={school} onChange={(e) => setSchool(e.target.value)}
              style={inputStyle(darkMode)}
            />
          </label>
          <label style={labelStyle(darkMode)}>
            {t('auth.grade')}
            <select value={grade} onChange={(e) => setGrade(e.target.value)} style={inputStyle(darkMode)}>
              <option value="">— {t('auth.selectGrade')} —</option>
              {GRADE_LEVELS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle(darkMode)}>
            {t('common.subject')}
            <select value={defaultSubject} onChange={(e) => setDefaultSubject(e.target.value)} style={inputStyle(darkMode)}>
              <option value="">— {t('common.none')} —</option>
              {availableSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          {error && <p style={errorStyle(darkMode)}>❌ {error}</p>}
          <button type="submit" disabled={submitting} style={buttonStyle(darkMode, submitting)}>
            {submitting ? t('auth.registerSubmitting') : t('auth.registerSubmit')}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 16, textAlign: 'center', color: darkMode ? '#a89bc4' : '#666' }}>
        {t('auth.hasAccount')}{' '}
        <Link to="/login" style={{ color: darkMode ? '#c9a8ff' : '#be185d', fontWeight: 600 }}>
          {t('auth.loginLink')}
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
