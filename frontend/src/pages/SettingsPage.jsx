import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [showName, setShowName] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) setShowName(user.showName ?? true);
  }, [user]);

  if (loading || !user) return <p>Se încarcă...</p>;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch('/auth/settings', { showName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const preview = showName && user.name ? user.name : `@${user.username}`;

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Setări cont</h1>

      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 16, fontSize: 18 }}>Afișare pe profilul tău</h2>
        <p style={{ marginBottom: 20, color: '#aaa', fontSize: 14 }}>
          Alege ce se vede ca titlu pe pagina ta de profil. Pe leaderboard apare întotdeauna username-ul.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={optionStyle(showName)}>
            <input
              type="radio"
              name="displayMode"
              checked={showName}
              onChange={() => setShowName(true)}
              style={{ accentColor: '#a855f7' }}
            />
            <div>
              <strong>Nume</strong>
              <span style={{ display: 'block', fontSize: 13, color: '#999', marginTop: 2 }}>
                {user.name ? `Apare ca: "${user.name}"` : 'Nu ai setat un nume — se va folosi username-ul ca fallback'}
              </span>
            </div>
          </label>

          <label style={optionStyle(!showName)}>
            <input
              type="radio"
              name="displayMode"
              checked={!showName}
              onChange={() => setShowName(false)}
              style={{ accentColor: '#a855f7' }}
            />
            <div>
              <strong>Username</strong>
              <span style={{ display: 'block', fontSize: 13, color: '#999', marginTop: 2 }}>
                Apare ca: "@{user.username}"
              </span>
            </div>
          </label>
        </div>

        <div style={previewBoxStyle}>
          <span style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Previzualizare profil:</span>
          <span style={{ fontSize: 20, fontWeight: 600, color: '#e8e0ff' }}>{preview}</span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={saving ? { ...btnStyle, opacity: 0.6 } : btnStyle}
        >
          {saving ? 'Se salvează...' : saved ? '✓ Salvat!' : 'Salvează'}
        </button>
      </div>
    </div>
  );
}

const sectionStyle = {
  border: '1px solid rgba(120, 60, 200, 0.25)',
  borderRadius: 12,
  padding: 24,
  background: 'rgba(20, 10, 40, 0.6)',
};

const optionStyle = (active) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 8,
  border: `1px solid ${active ? 'rgba(168, 85, 247, 0.6)' : 'rgba(100, 60, 160, 0.2)'}`,
  background: active ? 'rgba(120, 40, 200, 0.15)' : 'transparent',
  cursor: 'pointer',
  transition: 'all 0.15s',
});

const previewBoxStyle = {
  marginTop: 20,
  padding: '14px 16px',
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(100, 60, 160, 0.2)',
};

const btnStyle = {
  marginTop: 20,
  padding: '10px 24px',
  background: 'rgba(120, 40, 200, 0.7)',
  color: 'white',
  border: '1px solid rgba(168, 85, 247, 0.5)',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 15,
};
