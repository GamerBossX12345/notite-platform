// /requests — sistem de cereri. Userii cer notițe care lipsesc, alții le împlinesc.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];
const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

const STATUS_TABS = [
  { key: 'OPEN',      label: 'Deschise' },
  { key: 'FULFILLED', label: 'Împlinite' },
  { key: 'CLOSED',    label: 'Închise' },
];

export default function RequestsPage() {
  const { user, darkMode } = useAuth();
  const [status, setStatus] = useState('OPEN');
  const [data, setData] = useState({ requests: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    const params = { status, page };
    if (mineOnly && user) params.mine = 1;
    api.get('/requests', { params })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); /* eslint-disable-line */ }, [status, page, mineOnly]);
  useEffect(() => { setPage(1); }, [status, mineOnly]);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 28, margin: 0, color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>
          📋 Cereri de notițe
        </h1>
        {user && (
          <button onClick={() => setShowForm(s => !s)} style={primaryBtn(darkMode)}>
            {showForm ? 'Anulează' : '+ Cerere nouă'}
          </button>
        )}
      </div>
      <p style={{ color: darkMode ? '#a89bc4' : '#666', fontSize: 14, margin: '8px 0 20px' }}>
        Nu găsești o notiță de care ai nevoie? Cere-o aici — alți utilizatori o pot împlini
        legând o notiță existentă.
      </p>

      {showForm && user && (
        <RequestForm
          darkMode={darkMode}
          onCreated={() => { setShowForm(false); setStatus('OPEN'); setPage(1); load(); }}
        />
      )}

      {/* Tab-uri status + filtru "ale mele" */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            style={tabBtn(darkMode, status === t.key)}
          >
            {t.label}
          </button>
        ))}
        {user && (
          <label style={{ marginLeft: 'auto', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: darkMode ? '#a89bc4' : '#666', cursor: 'pointer' }}>
            <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} style={{ accentColor: '#a855f7' }} />
            Doar cererile mele
          </label>
        )}
      </div>

      {loading && <p>Se încarcă...</p>}
      {error && <p style={{ color: '#ef4444' }}>Eroare: {error}</p>}

      {!loading && !error && (
        data.requests.length === 0 ? (
          <p style={{ color: darkMode ? '#a89bc4' : '#666' }}>
            Nicio cerere {status === 'OPEN' ? 'deschisă' : status === 'FULFILLED' ? 'împlinită' : 'închisă'}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.requests.map(r => (
              <RequestCard key={r.id} request={r} darkMode={darkMode} user={user} onChange={load} />
            ))}
          </div>
        )
      )}

      {data.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} style={pageBtn(darkMode)}>‹ Anterior</button>
          <span style={{ padding: '6px 12px', color: darkMode ? '#a89bc4' : '#888', fontSize: 14 }}>
            Pagina {page} / {data.totalPages}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} style={pageBtn(darkMode)}>Următor ›</button>
        </div>
      )}
    </div>
  );
}

function RequestForm({ darkMode, onCreated }) {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject]         = useState('');
  const [gradeLevel, setGradeLevel]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (title.trim().length < 8) {
      setError('Titlul trebuie să aibă cel puțin 8 caractere.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/requests', {
        title,
        description: description || undefined,
        subject: subject || undefined,
        gradeLevel: gradeLevel || undefined,
      });
      setTitle(''); setDescription(''); setSubject(''); setGradeLevel('');
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la trimitere');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle(darkMode)}>
      <label style={labelStyle(darkMode)}>
        Ce notiță cauți?
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="ex: Notițe fizică clasa 11, cap. termodinamică"
          maxLength={200}
          style={inputStyle(darkMode)}
        />
      </label>
      <label style={labelStyle(darkMode)}>
        Detalii <span style={{ fontWeight: 400, opacity: 0.7 }}>(opțional)</span>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ce anume îți trebuie? Subcapitole, tip de notiță, etc."
          rows={3}
          maxLength={2000}
          style={{ ...inputStyle(darkMode), resize: 'vertical' }}
        />
      </label>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ ...labelStyle(darkMode), flex: 1, minWidth: 140 }}>
          Materie <span style={{ fontWeight: 400, opacity: 0.7 }}>(opțional)</span>
          <select value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle(darkMode)}>
            <option value="">— oricare —</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ ...labelStyle(darkMode), flex: 1, minWidth: 140 }}>
          Clasă <span style={{ fontWeight: 400, opacity: 0.7 }}>(opțional)</span>
          <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={inputStyle(darkMode)}>
            <option value="">— oricare —</option>
            {GRADE_LEVELS.map(g => <option key={g} value={g}>a {g}-a</option>)}
          </select>
        </label>
      </div>
      {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
      <button type="submit" disabled={submitting} style={{ ...primaryBtn(darkMode), marginTop: 8 }}>
        {submitting ? 'Se trimite...' : 'Publică cererea'}
      </button>
    </form>
  );
}

function RequestCard({ request: r, darkMode, user, onChange }) {
  const [fulfilling, setFulfilling] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOwner = user && user.id === r.user.id;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HEAD_ADMIN';
  const authorName = r.user.showName && r.user.name ? r.user.name : r.user.username;

  async function doClose() {
    if (!confirm('Închizi această cerere?')) return;
    setBusy(true);
    try { await api.post(`/requests/${r.id}/close`); onChange(); }
    catch (err) { alert(err.response?.data?.error || 'Eroare'); }
    finally { setBusy(false); }
  }
  async function doReopen() {
    setBusy(true);
    try { await api.post(`/requests/${r.id}/reopen`); onChange(); }
    catch (err) { alert(err.response?.data?.error || 'Eroare'); }
    finally { setBusy(false); }
  }
  async function doDelete() {
    if (!confirm('Ștergi definitiv această cerere?')) return;
    setBusy(true);
    try { await api.delete(`/requests/${r.id}`); onChange(); }
    catch (err) { alert(err.response?.data?.error || 'Eroare'); }
    finally { setBusy(false); }
  }

  return (
    <article style={cardStyle(darkMode)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>{r.title}</h3>
        <StatusBadge status={r.status} darkMode={darkMode} />
      </div>

      {r.description && (
        <p style={{ margin: '8px 0 0', fontSize: 14, whiteSpace: 'pre-wrap', color: darkMode ? '#d4c8ff' : '#444' }}>
          {r.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {r.subject && <span style={hintPill(darkMode)}>{r.subject}</span>}
        {r.gradeLevel && <span style={hintPill(darkMode)}>clasa a {r.gradeLevel}-a</span>}
      </div>

      <div style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#888', marginTop: 8 }}>
        cerut de{' '}
        <Link to={`/profile/${r.user.username}`} style={{ color: 'inherit' }}>{authorName}</Link>
        {' • '}{new Date(r.createdAt).toLocaleDateString('ro-RO')}
      </div>

      {/* Împlinită — arată notița */}
      {r.status === 'FULFILLED' && r.fulfilledNote && (
        <div style={fulfilledBoxStyle(darkMode)}>
          ✅ Împlinită cu{' '}
          <Link to={`/notes/${r.fulfilledNote.id}`} style={{ color: darkMode ? '#86efac' : '#16a34a', fontWeight: 600 }}>
            {r.fulfilledNote.title}
          </Link>
          {r.fulfilledBy && <> de @{r.fulfilledBy.username}</>}
        </div>
      )}

      {/* Acțiuni */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {r.status === 'OPEN' && user && (
          fulfilling ? (
            <FulfillPicker
              requestId={r.id}
              darkMode={darkMode}
              username={user.username}
              onDone={() => { setFulfilling(false); onChange(); }}
              onCancel={() => setFulfilling(false)}
            />
          ) : (
            <button onClick={() => setFulfilling(true)} style={smallBtn(darkMode, 'primary')} disabled={busy}>
              ✋ Împlinește
            </button>
          )
        )}
        {r.status === 'OPEN' && (isOwner || isAdmin) && !fulfilling && (
          <button onClick={doClose} style={smallBtn(darkMode)} disabled={busy}>Închide</button>
        )}
        {r.status === 'CLOSED' && (isOwner || isAdmin) && (
          <button onClick={doReopen} style={smallBtn(darkMode)} disabled={busy}>Redeschide</button>
        )}
        {(isOwner || isAdmin) && (
          <button onClick={doDelete} style={smallBtn(darkMode, 'danger')} disabled={busy}>Șterge</button>
        )}
      </div>
    </article>
  );
}

// Picker: alege una dintre notițele tale pentru a împlini cererea.
function FulfillPicker({ requestId, darkMode, username, onDone, onCancel }) {
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/notes', { params: { author: username, pageSize: 50 } })
      .then(res => setNotes(res.data.notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [username]);

  async function submit() {
    if (!selected) { setError('Alege o notiță.'); return; }
    setBusy(true);
    setError('');
    try {
      await api.post(`/requests/${requestId}/fulfill`, { noteId: selected });
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la împlinire');
      setBusy(false);
    }
  }

  if (loading) return <span style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#888' }}>Se încarcă notițele tale...</span>;

  if (notes.length === 0) {
    return (
      <span style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#888' }}>
        Nu ai notițe de legat.{' '}
        <Link to="/upload" style={{ color: darkMode ? '#c9a8ff' : '#6366f1' }}>Încarcă una</Link>, apoi revino.
        {' '}<button onClick={onCancel} style={{ ...smallBtn(darkMode), marginLeft: 6 }}>Renunță</button>
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
      <select value={selected} onChange={e => setSelected(e.target.value)} style={{ ...inputStyle(darkMode), flex: 1, minWidth: 180, marginTop: 0 }}>
        <option value="">— alege o notiță de-a ta —</option>
        {notes.map(n => (
          <option key={n.id} value={n.id}>{n.title} ({n.subject}, a {n.gradeLevel}-a)</option>
        ))}
      </select>
      <button onClick={submit} disabled={busy} style={smallBtn(darkMode, 'primary')}>
        {busy ? 'Se leagă...' : 'Confirmă'}
      </button>
      <button onClick={onCancel} disabled={busy} style={smallBtn(darkMode)}>Renunță</button>
      {error && <span style={{ color: '#ef4444', fontSize: 12, width: '100%' }}>{error}</span>}
    </div>
  );
}

function StatusBadge({ status, darkMode }) {
  const cfg = {
    OPEN:      { label: 'Deschisă',  color: '#3b82f6' },
    FULFILLED: { label: 'Împlinită', color: '#16a34a' },
    CLOSED:    { label: 'Închisă',   color: '#9ca3af' },
  }[status] || { label: status, color: '#888' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      color: cfg.color, background: `${cfg.color}1a`, border: `1px solid ${cfg.color}55`,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Stiluri ──────────────────────────────────────────────────────────────────
const primaryBtn = (darkMode) => ({
  padding: '8px 16px', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer',
  background: darkMode ? 'rgba(168, 85, 247, 0.25)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
  color: darkMode ? '#e8d4ff' : '#fff',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.6)' : 'none',
});
const tabBtn = (darkMode, active) => ({
  padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  border: active
    ? '1px solid rgba(168, 85, 247, 0.8)'
    : (darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(244, 114, 182, 0.4)'),
  background: active
    ? (darkMode ? 'rgba(168, 85, 247, 0.25)' : 'rgba(244, 114, 182, 0.18)')
    : 'transparent',
  color: active
    ? (darkMode ? '#e8d4ff' : '#9333ea')
    : (darkMode ? '#c9a8ff' : '#6b21a8'),
});
const cardStyle = (darkMode) => ({
  padding: 16, borderRadius: 10,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.25)' : '1px solid rgba(244, 114, 182, 0.3)',
  background: darkMode ? 'rgba(20, 8, 50, 0.5)' : 'rgba(255, 255, 255, 0.7)',
});
const formStyle = (darkMode) => ({
  display: 'flex', flexDirection: 'column', gap: 12, padding: 16, marginBottom: 20, borderRadius: 10,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(244, 114, 182, 0.4)',
  background: darkMode ? 'rgba(20, 8, 50, 0.6)' : 'rgba(255, 255, 255, 0.8)',
});
const labelStyle = (darkMode) => ({
  display: 'block', fontSize: 14, fontWeight: 500,
  color: darkMode ? '#d0c8e8' : '#222',
});
const inputStyle = (darkMode) => ({
  display: 'block', width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box',
  background: darkMode ? 'rgba(0, 0, 0, 0.3)' : '#fff',
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.3)' : '1px solid rgba(244, 114, 182, 0.4)',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 6, fontSize: 14,
});
const hintPill = (darkMode) => ({
  fontSize: 11, padding: '2px 8px', borderRadius: 999,
  background: darkMode ? 'rgba(120, 60, 200, 0.18)' : 'rgba(244, 114, 182, 0.14)',
  color: darkMode ? '#c9a8ff' : '#9333ea',
});
const fulfilledBoxStyle = (darkMode) => ({
  marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 13,
  background: darkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
  border: darkMode ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(34, 197, 94, 0.3)',
  color: darkMode ? '#d4c8ff' : '#444',
});
const smallBtn = (darkMode, variant) => {
  const base = {
    padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };
  if (variant === 'primary') return {
    ...base,
    background: darkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(244, 114, 182, 0.15)',
    color: darkMode ? '#e8d4ff' : '#9333ea',
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(244, 114, 182, 0.5)',
  };
  if (variant === 'danger') return {
    ...base,
    background: 'transparent',
    color: '#dc2626',
    border: '1px solid rgba(220, 38, 38, 0.4)',
  };
  return {
    ...base,
    background: 'transparent',
    color: darkMode ? '#a89bc4' : '#666',
    border: darkMode ? '1px solid rgba(120, 60, 200, 0.3)' : '1px solid rgba(0, 0, 0, 0.15)',
  };
};
const pageBtn = (darkMode) => ({
  padding: '6px 14px', borderRadius: 4, cursor: 'pointer', background: 'transparent',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc',
  color: darkMode ? '#e8e0ff' : '#222',
});
