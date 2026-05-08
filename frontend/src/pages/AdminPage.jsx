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

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]               = useState('users');
  const [users, setUsers]           = useState([]);
  const [notes, setNotes]           = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError]           = useState(null);

  const [editTarget, setEditTarget] = useState(null); // { type: 'user'|'note', id }
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);

  const isAdmin = user?.username === 'Admin';

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.get('/admin/users'), api.get('/admin/notes')])
      .then(([u, n]) => { setUsers(u.data); setNotes(n.data); })
      .catch(err => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [isAdmin]);

  if (loading || dataLoading) return <p>Se încarcă...</p>;
  if (error) return <p style={{ color: 'red' }}>Eroare: {error}</p>;
  if (!isAdmin) return null;

  // ── Acțiuni utilizatori ──
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
      alert(err.response?.data?.error || 'Eroare la ștergere');
    }
  }

  // ── Acțiuni notițe ──
  function openEditNote(n) {
    setEditTarget({ type: 'note', id: n.id });
    setEditForm({ title: n.title, subject: n.subject, gradeLevel: n.gradeLevel, type: n.type, chapter: n.chapter || '' });
  }

  async function deleteNote(id) {
    if (!confirm('Ștergi această notiță?')) return;
    try {
      await api.delete(`/admin/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la ștergere');
    }
  }

  // ── Salvare modal ──
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

  function field(key) {
    return v => setEditForm(f => ({ ...f, [key]: v }));
  }

  return (
    <div>
      <h1>Panou admin</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        {users.length} utilizatori • {notes.length} notițe
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab('users')} style={tab === 'users' ? activeTab : tabBtn}>
          Utilizatori ({users.length})
        </button>
        <button onClick={() => setTab('notes')} style={tab === 'notes' ? activeTab : tabBtn}>
          Notițe ({notes.length})
        </button>
      </div>

      {/* Tabel utilizatori */}
      {tab === 'users' && (
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
              {users.map(u => (
                <tr key={u.id} style={{ background: u.username === 'Admin' ? '#fffbea' : 'transparent' }}>
                  <Td>{u.name || <span style={{ color: '#bbb' }}>—</span>}</Td>
                  <Td><strong>{u.username}</strong></Td>
                  <Td>{u.email}</Td>
                  <Td>{u.school || <span style={{ color: '#bbb' }}>—</span>}</Td>
                  <Td>{u.grade ? `a ${u.grade}-a` : <span style={{ color: '#bbb' }}>—</span>}</Td>
                  <Td>{u.reputation}</Td>
                  <Td>{u._count.notes}</Td>
                  <Td>{u._count.comments}</Td>
                  <Td>{new Date(u.createdAt).toLocaleDateString('ro-RO')}</Td>
                  <Td>
                    <button onClick={() => openEditUser(u)} style={btnEdit}>Editează</button>
                    {u.username !== 'Admin' && (
                      <button onClick={() => deleteUser(u.id)} style={btnDelete}>Șterge</button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabel notițe */}
      {tab === 'notes' && (
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
              {notes.map(n => (
                <tr key={n.id}>
                  <Td>
                    <a href={`/notes/${n.id}`} target="_blank" rel="noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>
                      {n.title}
                    </a>
                  </Td>
                  <Td>{n.author.name || n.author.username}</Td>
                  <Td>{n.subject}</Td>
                  <Td>a {n.gradeLevel}-a</Td>
                  <Td>{n.type}</Td>
                  <Td>
                    {n.ratingCount > 0
                      ? `★ ${n.avgRating.toFixed(1)} (${n.ratingCount})`
                      : <span style={{ color: '#bbb' }}>—</span>}
                  </Td>
                  <Td>{new Date(n.createdAt).toLocaleDateString('ro-RO')}</Td>
                  <Td>
                    <button onClick={() => openEditNote(n)} style={btnEdit}>Editează</button>
                    <button onClick={() => deleteNote(n.id)} style={btnDelete}>Șterge</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal editare */}
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

const tableStyle   = { width: '100%', borderCollapse: 'collapse' };
const tabBtn       = { padding: '8px 18px', border: '1px solid #ccc', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: 14 };
const activeTab    = { ...tabBtn, background: '#0066cc', color: 'white', border: '1px solid #0066cc' };
const btnEdit      = { padding: '3px 8px', marginRight: 6, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: 'white' };
const btnDelete    = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#dc3545', color: 'white' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox     = { background: 'white', padding: 24, borderRadius: 8, maxWidth: 460, width: '100%', margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle   = { display: 'block', marginBottom: 12, fontWeight: 500 };
const inputStyle   = { display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ccc', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '8px 16px', background: '#0066cc', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', background: 'white', color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' };
