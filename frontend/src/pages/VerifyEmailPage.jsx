import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { darkMode, refreshMe } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError(t('auth.emailVerifyError'));
      return;
    }

    api.get('/auth/verify-email', { params: { token } })
      .then(async res => {
        if (res.data?.token) {
          localStorage.setItem('token', res.data.token);
          await refreshMe();
        }
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 2000);
      })
      .catch(err => {
        setStatus('error');
        setError(err.response?.data?.error || t('auth.emailVerifyError'));
      });
  }, [searchParams, navigate, refreshMe, t]);

  return (
    <div style={{ maxWidth: 520, margin: '64px auto', textAlign: 'center', padding: 24 }}>
      <div style={cardStyle(darkMode)}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
            <h2 style={titleStyle(darkMode)}>{t('auth.verifyingEmail')}</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={titleStyle(darkMode)}>{t('auth.emailVerified')}</h2>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h2 style={titleStyle(darkMode)}>{t('common.error')}</h2>
            <p style={{ color: darkMode ? '#ff9999' : '#b91c1c', marginBottom: 16 }}>
              {error}
            </p>
            <Link to="/login" style={{ color: darkMode ? '#c9a8ff' : '#6366f1', textDecoration: 'none' }}>
              ← {t('auth.goToLogin')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

const cardStyle = (darkMode) => ({
  padding: 32,
  borderRadius: 12,
  background: darkMode ? 'rgba(20, 8, 50, 0.6)' : 'rgba(255, 255, 255, 0.7)',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(244, 114, 182, 0.3)',
  backdropFilter: 'blur(10px)',
});

const titleStyle = (darkMode) => ({
  margin: '0 0 12px',
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
});
