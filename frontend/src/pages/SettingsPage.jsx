import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';

export default function SettingsPage() {
  const { user, loading, logout, darkMode, updateDarkMode } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('profile');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    school: '',
    grade: '',
    bio: '',
  });
  const [showName, setShowName] = useState(true);
  const [themeDark, setThemeDark] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        school: user.school || '',
        grade: user.grade || '',
        bio: user.bio || '',
      });
      setShowName(user.showName ?? true);
      setThemeDark(user.darkMode ?? true);
    }
  }, [user]);

  useEffect(() => {
    setThemeDark(darkMode ?? true);
  }, [darkMode]);

  if (loading || !user) return <p>Se încarcă...</p>;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const sensitiveChanged =
    formData.email !== (user?.email || '') ||
    formData.username !== (user?.username || '');

  async function handleSaveProfile() {
    setConfirmError('');
    if (sensitiveChanged && !confirmPassword) {
      setConfirmError('Introduceți parola pentru a confirma schimbarea emailului sau username-ului.');
      return;
    }
    setSaving(true);
    setSaved('');
    try {
      await api.patch('/auth/profile', {
        name: formData.name || undefined,
        email: formData.email || undefined,
        username: formData.username || undefined,
        school: formData.school || undefined,
        grade: formData.grade ? Number(formData.grade) : undefined,
        bio: formData.bio || undefined,
        password: sensitiveChanged ? confirmPassword : undefined,
      });
      setSaved('profile');
      setConfirmPassword('');
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      setConfirmError(err.response?.data?.error || 'Eroare la salvare');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDisplay() {
    setSaving(true);
    setSaved('');
    try {
      await api.patch('/auth/settings', { showName });
      setSaved('display');
      setTimeout(() => setSaved(''), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTheme() {
    await updateDarkMode(themeDark);
    setSaved('theme');
    setTimeout(() => setSaved(''), 2500);
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setDeleteError('Introduceți parola pentru confirmare');
      return;
    }
    if (!window.confirm('Ești sigur? Ștergerea contului este permanentă și nu poate fi anulată.')) {
      return;
    }

    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete('/auth/account', { data: { password: deletePassword } });
      logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Eroare la ștergerea contului');
      setDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Setări cont</h1>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button
          onClick={() => setTab('profile')}
          style={tab === 'profile' ? activeTabStyle : inactiveTabStyle}
        >
          Profil
        </button>
        <button
          onClick={() => setTab('display')}
          style={tab === 'display' ? activeTabStyle : inactiveTabStyle}
        >
          Afișare
        </button>
        <button
          onClick={() => setTab('danger')}
          style={tab === 'danger' ? { ...activeTabStyle, color: '#ff4444' } : { ...inactiveTabStyle, color: '#ff6666' }}
        >
          Pericol
        </button>
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Date profil</h2>
          <p style={{ marginBottom: 20, color: '#aaa', fontSize: 14 }}>
            Actualizează informațiile tale personale.
          </p>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Nume</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={inputStyle}
              placeholder="Ex: Ion Popescu"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              style={inputStyle}
              placeholder="Ex: ion@example.com"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              style={inputStyle}
              placeholder="Ex: ionpop"
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Școală</label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleInputChange}
              style={inputStyle}
              placeholder="Ex: Colegiul Național X"
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...formGroupStyle, flex: 1 }}>
              <label style={labelStyle}>Clasa</label>
              <input
                type="number"
                name="grade"
                value={formData.grade}
                onChange={handleInputChange}
                style={inputStyle}
                min="5"
                max="12"
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Câteva cuvinte despre tine..."
            />
          </div>

          {sensitiveChanged && (
            <div style={{ ...formGroupStyle, marginTop: 8, padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.07)' }}>
              <label style={{ ...labelStyle, color: '#fbbf24' }}>
                ⚠ Ai modificat emailul sau username-ul. Confirmă cu parola ta:
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                style={inputStyle}
                placeholder="Parola ta"
              />
            </div>
          )}

          {confirmError && (
            <p style={{ color: '#ff6666', fontSize: 14, marginTop: 8, marginBottom: 0 }}>❌ {confirmError}</p>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            style={saving ? { ...btnStyle, opacity: 0.6 } : btnStyle}
          >
            {saving ? 'Se salvează...' : saved === 'profile' ? '✓ Salvat!' : 'Salvează profil'}
          </button>
        </div>
      )}

      {/* Display Tab */}
      {tab === 'display' && (
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Preferință afișare</h2>
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
                  {formData.name ? `Apare ca: "${formData.name}"` : 'Nu ai setat un nume — se va folosi username-ul'}
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
                  Apare ca: "@{formData.username}"
                </span>
              </div>
            </label>
          </div>

          <div style={previewBoxStyle}>
            <span style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Previzualizare profil:</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#e8e0ff' }}>
              {showName && formData.name ? formData.name : `@${formData.username}`}
            </span>
          </div>

          <button
            onClick={handleSaveDisplay}
            disabled={saving}
            style={saving ? { ...btnStyle, opacity: 0.6 } : btnStyle}
          >
            {saving ? 'Se salvează...' : saved === 'display' ? '✓ Salvat!' : 'Salvează preferință'}
          </button>

          <h2 style={{ ...sectionTitleStyle, marginTop: 32 }}>Temă</h2>
          <p style={{ marginBottom: 20, color: '#aaa', fontSize: 14 }}>
            Alege tema de culoare pentru interfață.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={optionStyle(themeDark)}>
              <input
                type="radio"
                name="theme"
                checked={themeDark}
                onChange={() => setThemeDark(true)}
                style={{ accentColor: '#a855f7' }}
              />
              <div>
                <strong>Modul Întunecat</strong>
                <span style={{ display: 'block', fontSize: 13, color: '#999', marginTop: 2 }}>
                  Tema implicită cu fundal închis
                </span>
              </div>
            </label>

            <label style={optionStyle(!themeDark)}>
              <input
                type="radio"
                name="theme"
                checked={!themeDark}
                onChange={() => setThemeDark(false)}
                style={{ accentColor: '#a855f7' }}
              />
              <div>
                <strong>Modul Luminos</strong>
                <span style={{ display: 'block', fontSize: 13, color: '#999', marginTop: 2 }}>
                  Tema alternativă cu fundal deschis
                </span>
              </div>
            </label>
          </div>

          <button
            onClick={handleSaveTheme}
            disabled={saving}
            style={saving ? { ...btnStyle, opacity: 0.6, marginTop: 20 } : { ...btnStyle, marginTop: 20 }}
          >
            {saving ? 'Se salvează...' : saved === 'theme' ? '✓ Salvat!' : 'Salvează temă'}
          </button>
        </div>
      )}

      {/* Danger Zone Tab */}
      {tab === 'danger' && (
        <div style={{ ...sectionStyle, borderColor: 'rgba(255, 68, 68, 0.2)', background: 'rgba(255, 20, 20, 0.08)' }}>
          <h2 style={{ ...sectionTitleStyle, color: '#ff6666' }}>Ștergere cont</h2>
          <p style={{ marginBottom: 20, color: '#ff9999', fontSize: 14 }}>
            <strong>Atenție!</strong> Ștergerea contului este permanentă. Toate notițele, comentariile și datele vor fi șterse.
          </p>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Introduceți parola pentru confirmare:</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              style={inputStyle}
              placeholder="Parola ta"
              disabled={deleting}
            />
          </div>

          {deleteError && (
            <p style={{ color: '#ff6666', fontSize: 14, marginBottom: 12 }}>❌ {deleteError}</p>
          )}

          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            style={{
              padding: '10px 24px',
              background: deleting ? 'rgba(255, 68, 68, 0.5)' : 'rgba(255, 68, 68, 0.8)',
              color: 'white',
              border: '1px solid #ff4444',
              borderRadius: 6,
              cursor: deleting ? 'default' : 'pointer',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {deleting ? 'Se șterge...' : '🗑 Șterge permanent contul'}
          </button>
        </div>
      )}
    </div>
  );
}

const tabsStyle = {
  display: 'flex',
  gap: 8,
  marginBottom: 24,
  borderBottom: '1px solid rgba(100, 60, 160, 0.2)',
};

const activeTabStyle = {
  padding: '10px 16px',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid rgba(168, 85, 247, 0.8)',
  color: '#a855f7',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};

const inactiveTabStyle = {
  padding: '10px 16px',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: '#666',
  cursor: 'pointer',
  fontSize: 14,
};

const sectionStyle = {
  border: '1px solid rgba(120, 60, 200, 0.25)',
  borderRadius: 12,
  padding: 24,
  background: 'rgba(20, 10, 40, 0.6)',
};

const sectionTitleStyle = {
  marginBottom: 12,
  fontSize: 18,
  color: '#e8e0ff',
};

const formGroupStyle = {
  marginBottom: 16,
};

const labelStyle = {
  display: 'block',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 6,
  color: '#d0c8e8',
};

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: 10,
  boxSizing: 'border-box',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(120, 60, 200, 0.25)',
  borderRadius: 6,
  color: '#e8e0ff',
  fontSize: 14,
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
  fontWeight: 600,
};
