import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const STATUS_LABEL = {
  PENDING:  { label: '⏳ În așteptare', color: '#f59e0b' },
  OPEN:     { label: '👀 În analiză', color: '#3b82f6' },
  RESOLVED: { label: '✅ Soluționat',   color: '#10b981' },
};

const RESOLUTION_LABEL = {
  UPHELD:     { label: 'Ban menținut',  color: '#dc2626' },
  OVERTURNED: { label: 'Ban ridicat',   color: '#10b981' },
};

export default function BannedPage() {
  const { user, darkMode, logout, refreshMe } = useAuth();
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!user) return <p>Se încarcă...</p>;
  if (!user.banned || !user.banInfo) {
    return (
      <div style={{ maxWidth: 500, margin: '64px auto', padding: 24 }}>
        <h1>Contul tău nu este banat</h1>
        <p>Această pagină e doar pentru conturile banate.</p>
      </div>
    );
  }

  const info = user.banInfo;
  const appeal = info.appeal;
  const statusBadge = appeal ? STATUS_LABEL[appeal.status] : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/ban-appeal', { message, isPublic });
      setMessage('');
      if (refreshMe) await refreshMe();
    } catch (err) {
      setError(err.response?.data?.error || 'Nu am putut trimite apelul.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <div style={banCardStyle(darkMode)}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🚫</div>
        <h1 style={{ margin: '0 0 8px', textAlign: 'center' }}>Cont banat</h1>
        <p style={{ textAlign: 'center', color: darkMode ? '#d4b8ff' : '#6b21a8', margin: 0 }}>
          Salut <strong>{user.username}</strong>. Contul tău a fost banat de un admin.
        </p>

        <hr style={hrStyle(darkMode)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Stat label="Banat la" value={new Date(info.bannedAt).toLocaleString('ro-RO')} darkMode={darkMode} />
          <Stat
            label={`Șters automat la (${info.autoDeleteDays} zile)`}
            value={new Date(info.autoDeleteAt).toLocaleString('ro-RO')}
            darkMode={darkMode}
          />
        </div>

        {info.banReason && (
          <Block label="Motiv" darkMode={darkMode}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{info.banReason}</p>
          </Block>
        )}

        {info.banNote && (
          <Block label="Notița care a dus la ban" darkMode={darkMode}>
            <p style={{ margin: 0 }}>
              <strong>{info.banNote.title}</strong> — {info.banNote.subject}
            </p>
          </Block>
        )}

        {info.banComment && (
          <Block label="Comentariul care a dus la ban" darkMode={darkMode}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
              „{info.banComment.content}"
            </p>
            {info.banComment.note && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                pe notița: {info.banComment.note.title}
              </p>
            )}
          </Block>
        )}

        <hr style={hrStyle(darkMode)} />

        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Apel</h2>
        {appeal ? (
          <div style={appealBoxStyle(darkMode)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ ...badgeStyle, background: statusBadge.color }}>{statusBadge.label}</span>
              <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                Depus la {new Date(appeal.createdAt).toLocaleString('ro-RO')}
              </span>
            </div>
            <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{appeal.message}</p>

            {appeal.status === 'RESOLVED' && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                <p style={{ margin: '0 0 6px' }}>
                  <strong>Verdict:</strong>{' '}
                  <span style={{ color: RESOLUTION_LABEL[appeal.resolution]?.color }}>
                    {RESOLUTION_LABEL[appeal.resolution]?.label || appeal.resolution}
                  </span>
                </p>
                {appeal.adminResponse && (
                  <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                    {appeal.adminResponse}
                  </p>
                )}
              </div>
            )}
            {appeal.status !== 'RESOLVED' && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: darkMode ? '#a89bc4' : '#6b7280' }}>
                ⓘ Cât timp acest apel e activ, contul tău NU va fi șters automat.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 14, marginBottom: 8, color: darkMode ? '#c4b5fd' : '#4b5563' }}>
              Dacă crezi că ban-ul a fost o greșeală, depune un apel.
              Cât timp apelul e activ, contul tău <strong>nu va fi șters</strong>.
            </p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Explică de ce ar trebui ridicat ban-ul (minim 20 caractere)..."
              rows={6}
              required
              minLength={20}
              maxLength={5000}
              style={textareaStyle(darkMode)}
            />
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '8px 10px', borderRadius: 6, background: darkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(244, 114, 182, 0.06)' }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#a855f7' }}
              />
              <span style={{ fontSize: 13, color: darkMode ? '#c4b5fd' : '#4b5563' }}>
                <strong>Fă apelul public</strong> după ce e rezolvat. Va apărea anonimizat
                (primele litere ale username-ului) la <Link to="/appeals/public" style={{ color: '#a855f7' }}>/appeals/public</Link>,
                pentru transparență comunității.
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                {message.length} / 5000
              </span>
              {error && <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>}
              <button type="submit" disabled={submitting || message.trim().length < 20} style={submitBtnStyle}>
                {submitting ? 'Se trimite...' : 'Depune apel'}
              </button>
            </div>
          </form>
        )}

        <hr style={hrStyle(darkMode)} />

        <div style={{ textAlign: 'center' }}>
          <button onClick={logout} style={logoutBtnStyle(darkMode)}>
            Deconectare
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, darkMode }) {
  return (
    <div style={{ padding: 10, borderRadius: 6, background: darkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.06)' }}>
      <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
    </div>
  );
}

function Block({ label, children, darkMode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: darkMode ? '#a89bc4' : '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ padding: 10, borderRadius: 6, background: darkMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)' }}>
        {children}
      </div>
    </div>
  );
}

const banCardStyle = (darkMode) => ({
  padding: 28, borderRadius: 12,
  background: darkMode ? 'rgba(35, 12, 50, 0.85)' : 'rgba(255, 255, 255, 0.92)',
  border: darkMode ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid rgba(220, 38, 38, 0.3)',
  boxShadow: darkMode ? '0 8px 32px rgba(220, 38, 38, 0.2)' : '0 8px 32px rgba(0,0,0,0.1)',
});

const hrStyle = (darkMode) => ({
  border: 'none',
  borderTop: darkMode ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid rgba(0,0,0,0.1)',
  margin: '20px 0',
});

const textareaStyle = (darkMode) => ({
  width: '100%',
  padding: 12,
  borderRadius: 6,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #d1d5db',
  background: darkMode ? 'rgba(0,0,0,0.3)' : '#fff',
  color: 'inherit',
  fontFamily: 'inherit',
  fontSize: 14,
  resize: 'vertical',
  boxSizing: 'border-box',
});

const submitBtnStyle = {
  padding: '8px 16px', background: '#7c3aed', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500,
};

const logoutBtnStyle = (darkMode) => ({
  padding: '8px 18px', background: 'transparent',
  color: darkMode ? '#c4b5fd' : '#5b21b6',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #c4b5fd',
  borderRadius: 6, cursor: 'pointer',
});

const appealBoxStyle = (darkMode) => ({
  padding: 16, borderRadius: 8,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #e5e7eb',
  background: darkMode ? 'rgba(168, 85, 247, 0.05)' : 'rgba(168, 85, 247, 0.03)',
});

const badgeStyle = {
  display: 'inline-block', padding: '2px 10px', borderRadius: 999,
  color: 'white', fontSize: 12, fontWeight: 600,
};
