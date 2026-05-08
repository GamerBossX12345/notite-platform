import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';

const NOTE_TYPES = [
  { value: 'REZUMAT',           label: 'Rezumat' },
  { value: 'EXERCITII',         label: 'Exerciții' },
  { value: 'FISA',              label: 'Fișă' },
  { value: 'HARTA_CONCEPTUALA', label: 'Hartă conceptuală' },
];
const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

const REASON_LABEL = {
  PLAGIAT:             'Plagiat',
  CONTINUT_NEPOTRIVIT: 'Conținut nepotrivit',
  SPAM:                'Spam',
  ALTUL:               'Altul',
};
const STATUS_STYLE = {
  PENDING:  { background: '#fff3cd', color: '#856404', label: 'În așteptare' },
  REVIEWED: { background: '#cce5ff', color: '#004085', label: 'Verificat' },
  RESOLVED: { background: '#d4edda', color: '#155724', label: 'Rezolvat' },
};
const AI_VERDICT_STYLE = {
  VALID:     { background: '#d4edda', color: '#155724', label: '✔ Valid' },
  INVALID:   { background: '#f8d7da', color: '#721c24', label: '✘ Invalid' },
  UNCERTAIN: { background: '#fff3cd', color: '#856404', label: '? Nesigur' },
};

// ── Mici componente reutilizabile ────────────────────────────────────────────
function Th({ children }) {
  return (
    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: 13, fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
}
function Td({ children }) {
  return (
    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13, verticalAlign: 'middle' }}>
      {children}
    </td>
  );
}
function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label style={labelStyle}>
      {label}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} style={inputStyle} />
    </label>
  );
}
function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding: '7px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14, width: 280, marginBottom: 16, boxSizing: 'border-box' }}
    />
  );
}
function Empty({ label }) {
  return <p style={{ color: '#999', padding: '16px 0' }}>Niciun rezultat{label ? ` pentru "${label}"` : ''}.</p>;
}

// ── Pagina principală ────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]               = useState('users');
  const [users, setUsers]           = useState([]);
  const [notes, setNotes]           = useState([]);
  const [reports, setReports]       = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError]           = useState(null);

  // Căutare per tab
  const [userQuery, setUserQuery]     = useState('');
  const [noteQuery, setNoteQuery]     = useState('');
  const [reportQuery, setReportQuery] = useState('');

  // Modal editare
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const pendingCount = reports.filter(r => r.status === 'PENDING').length;

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/notes'),
      api.get('/admin/reports'),
    ])
      .then(([u, n, r]) => { setUsers(u.data); setNotes(n.data); setReports(r.data); })
      .catch(err => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [isAdmin]);

  if (loading || dataLoading) return <p>Se încarcă...</p>;
  if (error) return <p style={{ color: 'red' }}>Eroare: {error}</p>;
  if (!isAdmin) return null;

  // ── Filtrare ─────────────────────────────────────────────────────────────
  const q = s => s.toLowerCase();

  const filteredUsers = users.filter(u => {
    if (!userQuery) return true;
    const s = q(userQuery);
    return q(u.username).includes(s) || q(u.email).includes(s) || q(u.name || '').includes(s);
  });

  const filteredNotes = notes.filter(n => {
    if (!noteQuery) return true;
    const s = q(noteQuery);
    return q(n.title).includes(s) || q(n.subject).includes(s) || q(n.author.username).includes(s);
  });

  const filteredReports = reports.filter(r => {
    if (!reportQuery) return true;
    const s = q(reportQuery);
    return q(r.note.title).includes(s)
      || q(r.reporter.username).includes(s)
      || q(REASON_LABEL[r.reason] || r.reason).includes(s);
  });

  // ── Acțiuni utilizatori ──────────────────────────────────────────────────
  function openEditUser(u) {
    setEditTarget({ type: 'user', id: u.id });
    setEditForm({ name: u.name || '', email: u.email, username: u.username, school: u.school || '', grade: u.grade || '' });
  }

  async function deleteUser(id) {
    if (!confirm('Ștergi utilizatorul și toate datele sale? Acțiunea este ireversibilă.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  // ── Acțiuni notițe ────────────────────────────────────────────────────────
  function openEditNote(n) {
    setEditTarget({ type: 'note', id: n.id });
    setEditForm({ title: n.title, subject: n.subject, gradeLevel: n.gradeLevel, type: n.type, chapter: n.chapter || '' });
  }

  async function deleteNote(id) {
    if (!confirm('Ștergi această notiță?')) return;
    try {
      await api.delete(`/admin/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      setReports(prev => prev.filter(r => r.note.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  // ── Acțiuni raportări ─────────────────────────────────────────────────────
  async function setReportStatus(id, status) {
    try {
      const { data } = await api.patch(`/admin/reports/${id}`, { status });
      setReports(prev => prev.map(r => r.id === id ? data : r));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  async function deleteReport(id) {
    if (!confirm('Ștergi raportul?')) return;
    try {
      await api.delete(`/admin/reports/${id}`);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  async function deleteNoteFromReport(noteId) {
    if (!confirm('Ștergi notița raportată? Acțiunea este ireversibilă.')) return;
    try {
      await api.delete(`/admin/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      setReports(prev => prev.filter(r => r.note.id !== noteId));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  async function unhideNote(noteId) {
    try {
      await api.post(`/admin/notes/${noteId}/unhide`);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, hidden: false } : n));
      setReports(prev => prev.map(r =>
        r.note.id === noteId ? { ...r, note: { ...r.note, hidden: false } } : r
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  async function suspendAuthor(userId) {
    if (!confirm('Suspendă utilizatorul 48 de ore?')) return;
    try {
      const { data } = await api.post(`/admin/users/${userId}/suspend`);
      // Actualizează suspendedUntil în rapoarte și utilizatori
      setReports(prev => prev.map(r =>
        r.note.author.id === userId
          ? { ...r, note: { ...r.note, author: { ...r.note.author, suspendedUntil: data.suspendedUntil } } }
          : r
      ));
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspendedUntil: data.suspendedUntil } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  async function unsuspendAuthor(userId) {
    try {
      await api.post(`/admin/users/${userId}/unsuspend`);
      setReports(prev => prev.map(r =>
        r.note.author.id === userId
          ? { ...r, note: { ...r.note, author: { ...r.note.author, suspendedUntil: null } } }
          : r
      ));
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspendedUntil: null } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  async function deleteAuthorFromReport(userId) {
    if (!confirm('Ștergi utilizatorul și toate datele sale? Acțiunea este ireversibilă.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setNotes(prev => prev.filter(n => n.author.id !== userId));
      setReports(prev => prev.filter(r => r.note.author.id !== userId));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  // ── Salvare modal ─────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget.type === 'user') {
        const { data } = await api.patch(`/admin/users/${editTarget.id}`, editForm);
        setUsers(prev => prev.map(u => u.id === editTarget.id ? data : u));
      } else {
        const { data } = await api.patch(`/admin/notes/${editTarget.id}`, editForm);
        setNotes(prev => prev.map(n => n.id === editTarget.id ? data : n));
      }
      setEditTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la salvare');
    } finally {
      setSaving(false);
    }
  }

  const field = key => v => setEditForm(f => ({ ...f, [key]: v }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1>Panou admin</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        {users.length} utilizatori • {notes.length} notițe • {reports.length} raportări
      </p>

      {/* Tab-uri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('users')} style={tab === 'users' ? activeTab : tabBtn}>
          Utilizatori ({users.length})
        </button>
        <button onClick={() => setTab('notes')} style={tab === 'notes' ? activeTab : tabBtn}>
          Notițe ({notes.length})
        </button>
        <button onClick={() => setTab('reports')} style={tab === 'reports' ? activeTab : tabBtn}>
          Raportate ({reports.length})
          {pendingCount > 0 && (
            <span style={{ marginLeft: 6, background: '#dc3545', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Utilizatori ── */}
      {tab === 'users' && (
        <>
          <SearchBar value={userQuery} onChange={setUserQuery} placeholder="Caută după username, email sau prenume..." />
          {filteredUsers.length === 0 ? <Empty label={userQuery} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Prenume</Th><Th>Username</Th><Th>Email</Th>
                    <Th>Școală</Th><Th>Clasă</Th><Th>Rep.</Th>
                    <Th>Notițe</Th><Th>Comentarii</Th><Th>Cont creat</Th><Th>Acțiuni</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ background: u.role === 'ADMIN' ? '#fffbea' : 'transparent' }}>
                      <Td>{u.name || <Dash />}</Td>
                      <Td><strong>{u.username}</strong></Td>
                      <Td>{u.email}</Td>
                      <Td>{u.school || <Dash />}</Td>
                      <Td>{u.grade ? `a ${u.grade}-a` : <Dash />}</Td>
                      <Td>{u.reputation}</Td>
                      <Td>{u._count.notes}</Td>
                      <Td>{u._count.comments}</Td>
                      <Td>{new Date(u.createdAt).toLocaleDateString('ro-RO')}</Td>
                      <Td>
                        <button onClick={() => openEditUser(u)} style={btnEdit}>Editează</button>
                        {u.role !== 'ADMIN' && (
                          <button onClick={() => deleteUser(u.id)} style={btnDelete}>Șterge</button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Notițe ── */}
      {tab === 'notes' && (
        <>
          <SearchBar value={noteQuery} onChange={setNoteQuery} placeholder="Caută după titlu, materie sau autor..." />
          {filteredNotes.length === 0 ? <Empty label={noteQuery} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Titlu</Th><Th>Autor</Th><Th>Materie</Th>
                    <Th>Clasă</Th><Th>Tip</Th><Th>Rating</Th>
                    <Th>Publicat</Th><Th>Acțiuni</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotes.map(n => (
                    <tr key={n.id}>
                      <Td>
                        <a href={`/notes/${n.id}`} target="_blank" rel="noreferrer" style={{ color: n.hidden ? '#999' : '#0066cc', textDecoration: 'none' }}>
                          {n.title}
                        </a>
                        {n.hidden && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: '#b71c1c', color: 'white', borderRadius: 4, padding: '1px 5px' }}>
                            ascunsă
                          </span>
                        )}
                      </Td>
                      <Td>{n.author.name || n.author.username}</Td>
                      <Td>{n.subject}</Td>
                      <Td>a {n.gradeLevel}-a</Td>
                      <Td>{n.type}</Td>
                      <Td>
                        {n.ratingCount > 0
                          ? `★ ${n.avgRating.toFixed(1)} (${n.ratingCount})`
                          : <Dash />}
                      </Td>
                      <Td>{new Date(n.createdAt).toLocaleDateString('ro-RO')}</Td>
                      <Td>
                        <button onClick={() => openEditNote(n)} style={btnEdit}>Editează</button>
                        {n.hidden && (
                          <button onClick={() => unhideNote(n.id)} style={{ ...btnEdit, color: '#155724', border: '1px solid #4caf50' }}>
                            Repune
                          </button>
                        )}
                        <button onClick={() => deleteNote(n.id)} style={btnDelete}>Șterge</button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Raportări ── */}
      {tab === 'reports' && (
        <>
          <SearchBar value={reportQuery} onChange={setReportQuery} placeholder="Caută după titlu notiță, raportat de, motiv..." />
          {filteredReports.length === 0 ? <Empty label={reportQuery} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Notiță</Th><Th>Autor notiță</Th><Th>Raportat de</Th>
                    <Th>Motiv</Th><Th>Detalii</Th><Th>Verdict AI</Th>
                    <Th>Status</Th><Th>Data</Th><Th>Acțiuni</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => {
                    const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                    return (
                      <tr key={r.id}>
                        <Td>
                          <a href={`/notes/${r.note.id}`} target="_blank" rel="noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>
                            {r.note.title}
                          </a>
                          {r.note.hidden && (
                            <span style={{ marginLeft: 6, fontSize: 10, background: '#b71c1c', color: 'white', borderRadius: 4, padding: '1px 5px' }}>
                              ascunsă
                            </span>
                          )}
                        </Td>
                        <Td>
                          {r.note.author.username}
                          {r.note.author.suspendedUntil && new Date(r.note.author.suspendedUntil) > new Date() && (
                            <span style={{ marginLeft: 6, fontSize: 10, background: '#f57c00', color: 'white', borderRadius: 4, padding: '1px 5px' }}>
                              suspendat
                            </span>
                          )}
                        </Td>
                        <Td>{r.reporter.name || r.reporter.username}</Td>
                        <Td>{REASON_LABEL[r.reason] || r.reason}</Td>
                        <Td style={{ maxWidth: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {r.details || <Dash />}
                        </Td>
                        <Td>
                          {r.aiVerdict ? (
                            <div title={r.aiVerdictText || ''} style={{ cursor: r.aiVerdictText ? 'help' : 'default' }}>
                              <span style={{ ...badgeBase, ...AI_VERDICT_STYLE[r.aiVerdict] }}>
                                {AI_VERDICT_STYLE[r.aiVerdict]?.label ?? r.aiVerdict}
                              </span>
                              {r.aiVerdictText && (
                                <div style={{ fontSize: 11, color: '#666', marginTop: 3, maxWidth: 160, wordBreak: 'break-word' }}>
                                  {r.aiVerdictText}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Dash />
                          )}
                        </Td>
                        <Td>
                          <span style={{ ...badgeBase, background: st.background, color: st.color }}>
                            {st.label}
                          </span>
                        </Td>
                        <Td>{new Date(r.createdAt).toLocaleDateString('ro-RO')}</Td>
                        <Td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                            {/* Status */}
                            {r.status === 'PENDING' && (
                              <button onClick={() => setReportStatus(r.id, 'REVIEWED')} style={{ ...btnEdit, color: '#004085' }}>
                                Marchează verificat
                              </button>
                            )}
                            {r.status === 'REVIEWED' && (
                              <button onClick={() => setReportStatus(r.id, 'RESOLVED')} style={{ ...btnEdit, color: '#155724' }}>
                                Marchează rezolvat
                              </button>
                            )}
                            <hr style={{ margin: '2px 0', border: 'none', borderTop: '1px solid #eee' }} />
                            {/* Notiță */}
                            {r.note.hidden && (
                              <button onClick={() => unhideNote(r.note.id)} style={{ ...btnEdit, color: '#155724', border: '1px solid #4caf50' }}>
                                Repune notița
                              </button>
                            )}
                            <button onClick={() => deleteNoteFromReport(r.note.id)} style={{ ...btnDelete, background: '#e53935' }}>
                              Șterge notița
                            </button>
                            {/* Autor */}
                            {r.note.author.suspendedUntil && new Date(r.note.author.suspendedUntil) > new Date() ? (
                              <button onClick={() => unsuspendAuthor(r.note.author.id)} style={{ ...btnEdit, color: '#155724', border: '1px solid #4caf50' }}>
                                Ridică suspendarea
                              </button>
                            ) : (
                              <button onClick={() => suspendAuthor(r.note.author.id)} style={{ ...btnDelete, background: '#f57c00' }}>
                                Suspendă autor 48h
                              </button>
                            )}
                            <button onClick={() => deleteAuthorFromReport(r.note.author.id)} style={{ ...btnDelete, background: '#6d4c41' }}>
                              Șterge utilizator
                            </button>
                            <hr style={{ margin: '2px 0', border: 'none', borderTop: '1px solid #eee' }} />
                            <button onClick={() => deleteReport(r.id)} style={btnEdit}>
                              Șterge raport
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Modal editare ── */}
      {editTarget && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>
              {editTarget.type === 'user' ? 'Editează utilizator' : 'Editează notiță'}
            </h3>
            <form onSubmit={handleSave}>
              {editTarget.type === 'user' ? (
                <>
                  <Field label="Prenume"  value={editForm.name}     onChange={field('name')} />
                  <Field label="Username" value={editForm.username} onChange={field('username')} required />
                  <Field label="Email"    value={editForm.email}    onChange={field('email')} type="email" required />
                  <Field label="Școală"   value={editForm.school}   onChange={field('school')} />
                  <label style={labelStyle}>
                    Clasă
                    <select value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} style={inputStyle}>
                      <option value="">— nu e specificată —</option>
                      {GRADE_LEVELS.map(g => <option key={g} value={g}>a {g}-a</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <Field label="Titlu"   value={editForm.title}   onChange={field('title')} required />
                  <Field label="Materie" value={editForm.subject} onChange={field('subject')} required />
                  <label style={labelStyle}>
                    Clasă
                    <select value={editForm.gradeLevel} onChange={e => setEditForm(f => ({ ...f, gradeLevel: e.target.value }))} style={inputStyle}>
                      {GRADE_LEVELS.map(g => <option key={g} value={g}>a {g}-a</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>
                    Tip
                    <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                      {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <Field label="Capitol" value={editForm.chapter} onChange={field('chapter')} />
                </>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" disabled={saving} style={btnPrimary}>
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
                <button type="button" onClick={() => setEditTarget(null)} style={btnSecondary}>
                  Anulează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Dash() {
  return <span style={{ color: '#bbb' }}>—</span>;
}

const tableStyle   = { width: '100%', borderCollapse: 'collapse' };
const tabBtn       = { padding: '8px 18px', border: '1px solid #ccc', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: 14 };
const activeTab    = { ...tabBtn, background: '#0066cc', color: 'white', border: '1px solid #0066cc' };
const btnEdit      = { padding: '3px 8px', marginRight: 6, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: 'white' };
const btnDelete    = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#dc3545', color: 'white' };
const badgeBase    = { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500 };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox     = { background: 'white', padding: 24, borderRadius: 8, maxWidth: 460, width: '100%', margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle   = { display: 'block', marginBottom: 12, fontWeight: 500 };
const inputStyle   = { display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ccc', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '8px 16px', background: '#0066cc', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', background: 'white', color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' };
