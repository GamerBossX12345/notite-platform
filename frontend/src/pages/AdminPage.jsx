import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';

const NOTE_TYPES = [
  { value: 'REZUMAT',           label: 'Rezumat' },
  { value: 'EXERCITII',         label: 'Exerciții' },
  { value: 'FISA',              label: 'Fișă' },
  { value: 'HARTA_CONCEPTUALA', label: 'Hartă conceptuală' },
  { value: 'FORMULE',           label: 'Formule' },
];

const TYPE_BADGE = {
  REZUMAT:           { label: 'Rezumat',     bg: '#6366f1', color: 'white' },
  EXERCITII:         { label: 'Exerciții',   bg: '#10b981', color: 'white' },
  FISA:              { label: 'Fișă',        bg: '#f59e0b', color: '#3b2a00' },
  HARTA_CONCEPTUALA: { label: 'Hartă',       bg: '#ec4899', color: 'white' },
  FORMULE:           { label: 'Formule',     bg: '#06b6d4', color: 'white' },
};

const SUBJECT_COLORS = ['#f97316', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444', '#f59e0b', '#0ea5e9', '#84cc16', '#a855f7'];
function subjectColor(subject) {
  if (!subject) return '#6b7280';
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) & 0xffffffff;
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
}
const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

const REASON_LABEL = {
  PLAGIAT:             'Plagiat',
  CONTINUT_NEPOTRIVIT: 'Conținut nepotrivit',
  SPAM:                'Spam',
  ALTUL:               'Altul',
};
function reportStatusStyle(status, darkMode) {
  if (status === 'PENDING') return {
    background: darkMode ? 'rgba(245, 158, 11, 0.2)' : '#fff3cd',
    color:      darkMode ? '#fcd34d' : '#856404',
    border:     darkMode ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #fcd34d',
    label: 'În așteptare',
  };
  if (status === 'REVIEWED') return {
    background: darkMode ? 'rgba(59, 130, 246, 0.2)' : '#cce5ff',
    color:      darkMode ? '#93c5fd' : '#004085',
    border:     darkMode ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #93c5fd',
    label: 'Verificat',
  };
  return {
    background: darkMode ? 'rgba(16, 185, 129, 0.2)' : '#d4edda',
    color:      darkMode ? '#6ee7b7' : '#155724',
    border:     darkMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #6ee7b7',
    label: 'Rezolvat',
  };
}

// Stiluri AI verdict — adaptate la temă; etichete scurte (motivul rămâne în tooltip).
function aiVerdictStyle(verdict, darkMode) {
  if (verdict === 'VALID') return {
    background: darkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
    color: darkMode ? '#6ee7b7' : '#065f46',
    border: darkMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #34d399',
    label: '✔ Valid',
  };
  if (verdict === 'INVALID') return {
    background: darkMode ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2',
    color: darkMode ? '#fca5a5' : '#991b1b',
    border: darkMode ? '1px solid rgba(220, 38, 38, 0.4)' : '1px solid #fca5a5',
    label: '✘ Invalid',
  };
  return {
    background: darkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
    color: darkMode ? '#fcd34d' : '#92400e',
    border: darkMode ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #fcd34d',
    label: '? Nesigur',
  };
}

// ── Mici componente reutilizabile ────────────────────────────────────────────
function Th({ children, style }) {
  return (
    <th
      style={{
        padding: '10px 12px', textAlign: 'left',
        borderBottom: '2px solid rgba(168, 85, 247, 0.25)',
        fontSize: 12, fontWeight: 600,
        color: 'var(--th-color, #6b6375)', textTransform: 'uppercase', letterSpacing: 0.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </th>
  );
}
function Td({ children, style }) {
  return (
    <td
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid rgba(168, 85, 247, 0.12)',
        fontSize: 13, verticalAlign: 'middle',
        ...style,
      }}
    >
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

function AIVerdictBadge({ verdict, text, darkMode }) {
  const [open, setOpen] = useState(false);
  const v = aiVerdictStyle(verdict, darkMode);
  const hasText = !!text;
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <span
        style={{
          ...badgeBase,
          background: v.background, color: v.color, border: v.border,
          cursor: hasText ? 'help' : 'default',
          padding: '4px 10px', fontWeight: 600,
        }}
      >
        {v.label}
      </span>
      {open && hasText && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
            minWidth: 220, maxWidth: 320,
            padding: '10px 12px', borderRadius: 8,
            background: darkMode ? 'rgba(30, 15, 55, 0.97)' : '#ffffff',
            color: darkMode ? '#e8e0ff' : '#222',
            border: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.15)',
            fontSize: 12, lineHeight: 1.5, whiteSpace: 'normal',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: v.color, marginBottom: 4 }}>
            Motivul AI
          </div>
          {text}
        </div>
      )}
    </span>
  );
}

const ROLE_BADGE = {
  HEAD_ADMIN: { label: 'Head Admin', bg: '#7c3aed', color: 'white' },
  ADMIN:      { label: 'Admin',      bg: '#f59e0b', color: '#3b2a00' },
};

const APPEAL_STATUS = {
  PENDING:  { label: 'În așteptare', bg: '#f59e0b' },
  OPEN:     { label: 'În analiză',   bg: '#3b82f6' },
  RESOLVED: { label: 'Soluționat',   bg: '#10b981' },
};

function roleRowTint(role, darkMode) {
  if (role === 'HEAD_ADMIN') return darkMode ? 'rgba(124, 58, 237, 0.15)' : '#f3e8ff';
  if (role === 'ADMIN')      return darkMode ? 'rgba(245, 158, 11, 0.12)' : '#fff7e0';
  return 'transparent';
}

// ── Pagina principală ────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading, darkMode } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]               = useState('users');
  const [users, setUsers]           = useState([]);
  const [notes, setNotes]           = useState([]);
  const [reports, setReports]       = useState([]);
  const [appeals, setAppeals]       = useState([]);
  const [appealDetail, setAppealDetail] = useState(null); // selected appeal
  const [appealResponse, setAppealResponse] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError]           = useState(null);

  // Profesori (doar head admin)
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [inviteCodes, setInviteCodes]         = useState([]);

  // Config sistem (doar head admin)
  const [systemConfig, setSystemConfig] = useState({ bypassEmailVerification: 'false', adminDeviceVerificationDays: '', banAutoDeleteDays: '' });
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg]       = useState(null);

  // Căutare per tab
  const [userQuery, setUserQuery]     = useState('');
  const [noteQuery, setNoteQuery]     = useState('');
  const [reportQuery, setReportQuery] = useState('');

  // Modal editare
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);

  // Modal "Șterge notița" (programare + acțiune asupra autorului)
  const [delModal, setDelModal] = useState(null);  // {report} sau null
  const [delForm, setDelForm]   = useState({
    days: 7, reason: '',
    userAction: 'NONE', // NONE | WARN | SUSPEND | BAN
    warningText: '',
    suspendHours: 48,
  });
  const [delSaving, setDelSaving] = useState(false);

  const isAdmin       = user?.role === 'ADMIN' || user?.role === 'HEAD_ADMIN';
  const isHeadAdmin   = user?.role === 'HEAD_ADMIN';
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
      api.get('/admin/appeals'),
    ])
      .then(([u, n, r, a]) => { setUsers(u.data); setNotes(n.data); setReports(r.data); setAppeals(a.data); })
      .catch(err => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!isHeadAdmin) return;
    api.get('/admin/system-config')
      .then(res => setSystemConfig({
        bypassEmailVerification: res.data.bypassEmailVerification === 'true' ? 'true' : 'false',
        adminDeviceVerificationDays: res.data.adminDeviceVerificationDays || '',
        banAutoDeleteDays: res.data.banAutoDeleteDays || '',
      }))
      .catch(() => {});
    refreshTeacherData();
  }, [isHeadAdmin]);

  function refreshTeacherData() {
    if (!isHeadAdmin) return;
    Promise.all([
      api.get('/admin/teacher-requests'),
      api.get('/admin/teacher-invite-codes'),
    ])
      .then(([r, c]) => { setTeacherRequests(r.data); setInviteCodes(c.data); })
      .catch(() => {});
  }

  async function restartServer() {
    if (!confirm('Repornești serverul? Apelurile în curs vor fi întrerupte pentru câteva secunde.')) return;
    try {
      await api.post('/admin/server/restart');
      setConfigMsg({ type: 'ok', text: 'Server restart inițiat. Așteaptă ~5 secunde apoi reîmprospătează pagina.' });
    } catch (err) {
      setConfigMsg({ type: 'err', text: err.response?.data?.error || 'Eroare la repornire' });
    }
  }

  async function saveSystemConfig(e) {
    e.preventDefault();
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      await api.patch('/admin/system-config', systemConfig);
      setConfigMsg({ type: 'ok', text: 'Salvat.' });
    } catch (err) {
      setConfigMsg({ type: 'err', text: err.response?.data?.error || 'Eroare la salvare' });
    } finally {
      setConfigSaving(false);
    }
  }

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

  // Câte rapoarte are fiecare autor în total — folosit pentru insigna „repeat offender".
  const authorReportCount = reports.reduce((acc, r) => {
    const id = r.note?.author?.id;
    if (id) acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

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

  // „Raport fals" — repune notița dacă era ascunsă și marchează raportul ca soluționat.
  async function markReportFalse(r) {
    try {
      if (r.note.hidden) await api.post(`/admin/notes/${r.note.id}/unhide`);
      const { data } = await api.patch(`/admin/reports/${r.id}`, { status: 'RESOLVED' });
      setReports(prev => prev.map(x => x.id === r.id ? data : x));
      setNotes(prev => prev.map(n => n.id === r.note.id ? { ...n, hidden: false } : n));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  // Deschide modalul de „Șterge notița" cu prereglare din raport.
  function openDeleteNoteModal(r) {
    setDelModal({ report: r });
    setDelForm({
      days: 7,
      reason: `Raport: ${REASON_LABEL[r.reason] || r.reason}${r.details ? ` — ${r.details}` : ''}`,
      userAction: 'NONE',
      warningText: '',
      suspendHours: 48,
    });
  }

  async function submitDeleteNote() {
    if (!delModal) return;
    const r = delModal.report;
    setDelSaving(true);
    try {
      // 1) Programează ștergerea notiței
      await api.post(`/admin/notes/${r.note.id}/schedule-deletion`, {
        days: Number(delForm.days),
        reason: delForm.reason,
      });

      // 2) Acțiune asupra autorului
      const authorId = r.note.author.id;
      if (delForm.userAction === 'WARN') {
        await api.post(`/admin/users/${authorId}/warn`, { message: delForm.warningText });
      } else if (delForm.userAction === 'SUSPEND') {
        await api.post(`/admin/users/${authorId}/suspend`, { hours: Number(delForm.suspendHours) });
      } else if (delForm.userAction === 'BAN') {
        await api.post(`/admin/users/${authorId}/ban`, {
          reason: delForm.reason,
          noteId: r.note.id,
        });
      }

      // 3) Marchează raportul ca soluționat
      await api.patch(`/admin/reports/${r.id}`, { status: 'RESOLVED' });

      // 4) Reîncarcă tot
      const [u, n, rp] = await Promise.all([
        api.get('/admin/users'), api.get('/admin/notes'), api.get('/admin/reports'),
      ]);
      setUsers(u.data); setNotes(n.data); setReports(rp.data);

      setDelModal(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la programarea ștergerii');
    } finally {
      setDelSaving(false);
    }
  }

  async function banAuthor(userId, noteId, reason) {
    if (!confirm('Banează acest utilizator? Contul va fi șters automat după termenul setat dacă nu depune apel.')) return;
    try {
      await api.post(`/admin/users/${userId}/ban`, { reason, noteId });
      // Reîncărcăm toți userii ca să reflecte starea banned
      const u = await api.get('/admin/users');
      setUsers(u.data);
      // Reîncărcăm și apelurile (gol probabil, dar consistent)
      const a = await api.get('/admin/appeals');
      setAppeals(a.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la banare');
    }
  }

  async function unbanAuthor(userId) {
    try {
      await api.post(`/admin/users/${userId}/unban`);
      const u = await api.get('/admin/users');
      setUsers(u.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la deblocare');
    }
  }

  async function openAppealTicket(id) {
    try {
      const { data } = await api.post(`/admin/appeals/${id}/open`);
      setAppeals(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
      // refetch detail
      const detail = await api.get(`/admin/appeals/${id}`);
      setAppealDetail(detail.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la deschiderea tichetului');
    }
  }

  async function viewAppeal(id) {
    try {
      const { data } = await api.get(`/admin/appeals/${id}`);
      setAppealDetail(data);
      setAppealResponse('');
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare');
    }
  }

  async function resolveAppealTicket(id, resolution) {
    if (!confirm(resolution === 'OVERTURNED'
      ? 'Ridici ban-ul utilizatorului?'
      : 'Menții ban-ul? Contul va fi șters la termenul stabilit.')) return;
    try {
      await api.post(`/admin/appeals/${id}/resolve`, { resolution, response: appealResponse });
      const [a, u] = await Promise.all([api.get('/admin/appeals'), api.get('/admin/users')]);
      setAppeals(a.data);
      setUsers(u.data);
      setAppealDetail(null);
      setAppealResponse('');
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la soluționare');
    }
  }

  async function setUserRole(targetUser, newRole) {
    const verbs = { ADMIN: 'promovezi la admin', USER: 'retrogradezi la utilizator obișnuit' };
    if (!confirm(`Sigur ${verbs[newRole]} pe ${targetUser.username}?`)) return;
    try {
      const { data } = await api.post(`/admin/users/${targetUser.id}/set-role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: data.role } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la schimbarea rolului');
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
        <button onClick={() => setTab('appeals')} style={tab === 'appeals' ? activeTab : tabBtn}>
          Tichete ({appeals.length})
          {appeals.filter(a => a.status === 'PENDING').length > 0 && (
            <span style={{ marginLeft: 6, background: '#f59e0b', color: '#3b2a00', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>
              {appeals.filter(a => a.status === 'PENDING').length} noi
            </span>
          )}
        </button>
        {isHeadAdmin && (
          <button onClick={() => setTab('teachers')} style={tab === 'teachers' ? activeTab : tabBtn}>
            Profesori
            {teacherRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span style={{ marginLeft: 6, background: '#f59e0b', color: '#3b2a00', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>
                {teacherRequests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        )}
        {isHeadAdmin && (
          <button onClick={() => setTab('system')} style={tab === 'system' ? activeTab : tabBtn}>
            Sistem
          </button>
        )}
      </div>

      {/* ── Utilizatori ── */}
      {tab === 'users' && (
        <>
          <SearchBar value={userQuery} onChange={setUserQuery} placeholder="Caută după username, email sau nume..." />
          {filteredUsers.length === 0 ? <Empty label={userQuery} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Nume și prenume</Th><Th>Username</Th><Th>Rol</Th><Th>Email</Th>
                    <Th>Școală</Th><Th>Clasă</Th><Th>Rep.</Th>
                    <Th>Notițe</Th><Th>Comentarii</Th><Th>Cont creat</Th><Th>Acțiuni</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const badge = ROLE_BADGE[u.role];
                    const isSelf = u.id === user.id;
                    return (
                      <tr key={u.id} style={{ background: roleRowTint(u.role, darkMode) }}>
                        <Td>{u.name || <Dash />}</Td>
                        <Td><strong>{u.username}</strong></Td>
                        <Td>
                          {badge ? (
                            <span style={{ ...badgeBase, background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          ) : (
                            <span style={{ color: darkMode ? '#aaa' : '#666', fontSize: 12 }}>Utilizator</span>
                          )}
                        </Td>
                        <Td>{u.email}</Td>
                        <Td>{u.school || <Dash />}</Td>
                        <Td>{u.grade ? `a ${u.grade}-a` : <Dash />}</Td>
                        <Td>{u.reputation}</Td>
                        <Td>{u._count.notes}</Td>
                        <Td>{u._count.comments}</Td>
                        <Td>{new Date(u.createdAt).toLocaleDateString('ro-RO')}</Td>
                        <Td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            <button onClick={() => openEditUser(u)} style={btnEditStyle(darkMode)}>Editează</button>
                            {isHeadAdmin && !isSelf && u.role === 'USER' && (
                              <button onClick={() => setUserRole(u, 'ADMIN')} style={btnPromoteStyle}>
                                ↑ Promovează
                              </button>
                            )}
                            {isHeadAdmin && !isSelf && u.role === 'ADMIN' && (
                              <button onClick={() => setUserRole(u, 'USER')} style={btnDemoteStyle}>
                                ↓ Retrogradează
                              </button>
                            )}
                            {u.role !== 'HEAD_ADMIN' && (u.role !== 'ADMIN' || isHeadAdmin) && !isSelf && (
                              <button onClick={() => deleteUser(u.id)} style={btnDelete}>Șterge</button>
                            )}
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

      {/* ── Notițe ── */}
      {tab === 'notes' && (
        <>
          <SearchBar value={noteQuery} onChange={setNoteQuery} placeholder="Caută după titlu, materie sau autor..." />
          {filteredNotes.length === 0 ? <Empty label={noteQuery} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Notiță</Th>
                    <Th>Autor</Th>
                    <Th>Materie · Clasă</Th>
                    <Th>Tip</Th>
                    <Th>Rating</Th>
                    <Th>Publicat</Th>
                    <Th>Acțiuni</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotes.map(n => {
                    const typeBadge = TYPE_BADGE[n.type] || { label: n.type, bg: '#6b7280', color: 'white' };
                    const subjColor = subjectColor(n.subject);
                    return (
                      <tr key={n.id} style={{ background: n.hidden ? (darkMode ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2') : 'transparent' }}>
                        <Td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 4, height: 28, background: subjColor, borderRadius: 2, flexShrink: 0 }} />
                            <div>
                              <a
                                href={`/notes/${n.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: n.hidden ? (darkMode ? '#888' : '#999') : (darkMode ? '#c4b5fd' : '#5b21b6'),
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                }}
                              >
                                {n.title}
                              </a>
                              {n.chapter && (
                                <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginTop: 2 }}>
                                  {n.chapter}
                                </div>
                              )}
                              {n.hidden && !n.deletionScheduledAt && (
                                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, background: '#dc2626', color: 'white', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                                  🚫 ASCUNSĂ
                                </span>
                              )}
                              {n.deletionScheduledAt && (
                                <div style={{ marginTop: 4 }}>
                                  <span style={{ display: 'inline-block', fontSize: 10, background: '#b45309', color: 'white', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                                    ⏳ ȘTERGERE PROGRAMATĂ
                                  </span>
                                  <div style={{ fontSize: 10, color: darkMode ? '#fcd34d' : '#92400e', marginTop: 2 }}>
                                    pe {new Date(n.deletionScheduledAt).toLocaleDateString('ro-RO')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <div style={{ fontWeight: 500 }}>{n.author.name || n.author.username}</div>
                          {n.author.name && (
                            <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                              @{n.author.username}
                            </div>
                          )}
                        </Td>
                        <Td>
                          <span style={{ ...badgeBase, background: subjColor, color: 'white', fontWeight: 600 }}>
                            {n.subject}
                          </span>
                          <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginTop: 4 }}>
                            clasa a {n.gradeLevel}-a
                          </div>
                        </Td>
                        <Td>
                          <span style={{ ...badgeBase, background: typeBadge.bg, color: typeBadge.color, fontWeight: 600 }}>
                            {typeBadge.label}
                          </span>
                        </Td>
                        <Td>
                          {n.ratingCount > 0 ? (
                            <div>
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>★ {n.avgRating.toFixed(1)}</span>
                              <span style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginLeft: 4 }}>
                                ({n.ratingCount} {n.ratingCount === 1 ? 'vot' : 'voturi'})
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: darkMode ? '#6b7280' : '#9ca3af' }}>nevotată</span>
                          )}
                          <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginTop: 2 }}>
                            👁 {n.viewCount || 0}
                          </div>
                        </Td>
                        <Td>
                          <div style={{ fontSize: 13 }}>{new Date(n.createdAt).toLocaleDateString('ro-RO')}</div>
                          <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                            {new Date(n.createdAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </Td>
                        <Td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            <button onClick={() => openEditNote(n)} style={btnEditStyle(darkMode)}>Editează</button>
                            {n.hidden && (
                              <button onClick={() => unhideNote(n.id)} style={btnRestoreStyle}>↶ Repune</button>
                            )}
                            <button onClick={() => deleteNote(n.id)} style={btnDelete}>Șterge</button>
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
                    const st = reportStatusStyle(r.status, darkMode);
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
                          {authorReportCount[r.note.author.id] > 1 && (
                            <div
                              title={`Acest autor are ${authorReportCount[r.note.author.id]} rapoarte total în istoric`}
                              style={{
                                display: 'inline-block', marginLeft: 6, fontSize: 10,
                                background: '#b91c1c', color: 'white', borderRadius: 4,
                                padding: '1px 6px', fontWeight: 700, cursor: 'help',
                              }}
                            >
                              ⚠ {authorReportCount[r.note.author.id]}× raportat
                            </div>
                          )}
                        </Td>
                        <Td>{r.reporter.name || r.reporter.username}</Td>
                        <Td>{REASON_LABEL[r.reason] || r.reason}</Td>
                        <Td style={{ maxWidth: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {r.details || <Dash />}
                        </Td>
                        <Td>
                          {r.aiVerdict ? (
                            <AIVerdictBadge verdict={r.aiVerdict} text={r.aiVerdictText} darkMode={darkMode} />
                          ) : (
                            <Dash />
                          )}
                        </Td>
                        <Td>
                          <span style={{ ...badgeBase, background: st.background, color: st.color, border: st.border, fontWeight: 600 }}>
                            {st.label}
                          </span>
                        </Td>
                        <Td>{new Date(r.createdAt).toLocaleDateString('ro-RO')}</Td>
                        <Td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
                            <button
                              onClick={() => markReportFalse(r)}
                              style={btnFalseReport}
                              disabled={r.status === 'RESOLVED'}
                              title="Raportul e nefondat — repune notița dacă era ascunsă și marchează rezolvat"
                            >
                              ✓ Raport fals
                            </button>
                            <button
                              onClick={() => openDeleteNoteModal(r)}
                              style={btnDeleteNote}
                              disabled={r.status === 'RESOLVED'}
                              title="Programează ștergerea notiței și alege acțiunea asupra autorului"
                            >
                              🗑 Șterge notița
                            </button>
                            <button
                              onClick={() => deleteReport(r.id)}
                              style={btnEditStyle(darkMode)}
                              title="Doar șterge raportul fără să schimbi nimic"
                            >
                              Șterge raportul
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

      {/* ── Tichete (apeluri ban) ── */}
      {tab === 'appeals' && (
        <>
          {appeals.length === 0 ? (
            <Empty />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Utilizator</Th><Th>Status</Th><Th>Mesaj (extras)</Th>
                    <Th>Depus</Th><Th>Deschis de</Th><Th>Acțiuni</Th>
                  </tr>
                </thead>
                <tbody>
                  {appeals.map(a => {
                    const statusInfo = APPEAL_STATUS[a.status] || { label: a.status, bg: '#6b7280' };
                    return (
                      <tr key={a.id}>
                        <Td>
                          <strong>{a.user.username}</strong>
                          {a.user.banned && (
                            <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 10, background: '#dc2626', color: 'white', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                              BANAT
                            </span>
                          )}
                          <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280' }}>{a.user.email}</div>
                        </Td>
                        <Td>
                          <span style={{ ...badgeBase, background: statusInfo.bg, color: 'white' }}>
                            {statusInfo.label}
                          </span>
                          {a.resolution && (
                            <div style={{ fontSize: 11, marginTop: 4, color: a.resolution === 'OVERTURNED' ? '#10b981' : '#dc2626' }}>
                              {a.resolution === 'OVERTURNED' ? 'Ban ridicat' : 'Ban menținut'}
                            </div>
                          )}
                        </Td>
                        <Td style={{ maxWidth: 320 }}>
                          <div style={{ fontSize: 13, color: darkMode ? '#d4d4d8' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.message.length > 80 ? a.message.slice(0, 80) + '…' : a.message}
                          </div>
                        </Td>
                        <Td>{new Date(a.createdAt).toLocaleDateString('ro-RO')}</Td>
                        <Td>{a.openedBy?.username || <Dash />}</Td>
                        <Td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => viewAppeal(a.id)} style={btnEditStyle(darkMode)}>
                              Vezi
                            </button>
                            {a.status === 'PENDING' && (
                              <button onClick={() => openAppealTicket(a.id)} style={{ ...btnEditStyle(darkMode), background: '#7c3aed', color: 'white', border: 'none' }}>
                                Deschide
                              </button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal detaliu tichet */}
          {appealDetail && (
            <div style={modalOverlay}>
              <div style={{ ...modalBoxStyle(darkMode), maxWidth: 720 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <h3 style={{ marginTop: 0 }}>
                    Tichet — {appealDetail.user.username}
                  </h3>
                  <button onClick={() => { setAppealDetail(null); setAppealResponse(''); }} style={btnSecondary}>✕</button>
                </div>

                <p style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#6b7280' }}>
                  Banat la: {appealDetail.user.bannedAt ? new Date(appealDetail.user.bannedAt).toLocaleString('ro-RO') : '—'}
                </p>

                {appealDetail.user.banReason && (
                  <div style={{ marginBottom: 12 }}>
                    <strong>Motiv ban:</strong>
                    <p style={{ margin: '4px 0', padding: 8, background: darkMode ? 'rgba(0,0,0,0.3)' : '#f9fafb', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                      {appealDetail.user.banReason}
                    </p>
                  </div>
                )}

                {appealDetail.banNote && (
                  <div style={{ marginBottom: 12 }}>
                    <strong>Notița care a dus la ban:</strong>
                    <div style={{ padding: 10, background: darkMode ? 'rgba(0,0,0,0.3)' : '#f9fafb', borderRadius: 4, marginTop: 4 }}>
                      <a href={`/notes/${appealDetail.banNote.id}`} target="_blank" rel="noreferrer"
                         style={{ color: darkMode ? '#c4b5fd' : '#5b21b6', fontWeight: 600 }}>
                        {appealDetail.banNote.title}
                      </a>
                      <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                        {appealDetail.banNote.subject} • clasa a {appealDetail.banNote.gradeLevel}-a
                      </div>
                    </div>
                  </div>
                )}

                {appealDetail.banComment && (
                  <div style={{ marginBottom: 12 }}>
                    <strong>Comentariul care a dus la ban:</strong>
                    <div style={{ padding: 10, background: darkMode ? 'rgba(0,0,0,0.3)' : '#f9fafb', borderRadius: 4, marginTop: 4 }}>
                      <p style={{ margin: 0, fontStyle: 'italic' }}>„{appealDetail.banComment.content}"</p>
                      {appealDetail.banComment.note && (
                        <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280', marginTop: 4 }}>
                          pe notița <a href={`/notes/${appealDetail.banComment.note.id}`} target="_blank" rel="noreferrer">{appealDetail.banComment.note.title}</a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <strong>Mesaj apel:</strong>
                  <div style={{ padding: 12, background: darkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.05)', borderRadius: 6, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                    {appealDetail.message}
                  </div>
                </div>

                {appealDetail.status !== 'RESOLVED' ? (
                  <>
                    <label style={labelStyle}>
                      Răspuns către utilizator (opțional, vizibil în pagina /banned)
                      <textarea
                        value={appealResponse}
                        onChange={e => setAppealResponse(e.target.value)}
                        rows={3}
                        style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                        placeholder="Ex: Comentariul tău e clar abuz. Ban-ul rămâne."
                      />
                    </label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                      {appealDetail.status === 'PENDING' && (
                        <button onClick={() => openAppealTicket(appealDetail.id)} style={{ ...btnEditStyle(darkMode), background: '#7c3aed', color: 'white', border: 'none' }}>
                          Deschide tichet
                        </button>
                      )}
                      <button onClick={() => resolveAppealTicket(appealDetail.id, 'OVERTURNED')}
                              style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        ✓ Ridică ban-ul
                      </button>
                      <button onClick={() => resolveAppealTicket(appealDetail.id, 'UPHELD')}
                              style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        ✗ Menține ban-ul
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 12, background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 6 }}>
                    <p style={{ margin: '0 0 6px' }}>
                      <strong>Soluționat de:</strong> {appealDetail.resolvedBy?.username || '—'}
                      {' '}({appealDetail.resolution === 'OVERTURNED' ? 'ban ridicat' : 'ban menținut'})
                    </p>
                    {appealDetail.adminResponse && (
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{appealDetail.adminResponse}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Profesori (head admin) ── */}
      {tab === 'teachers' && isHeadAdmin && (
        <TeachersPanel
          requests={teacherRequests}
          codes={inviteCodes}
          darkMode={darkMode}
          onRefresh={refreshTeacherData}
        />
      )}

      {/* ── Sistem (head admin) ── */}
      {tab === 'system' && isHeadAdmin && (
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ marginTop: 0 }}>Configurare sistem</h2>
          <form onSubmit={saveSystemConfig}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={systemConfig.bypassEmailVerification === 'true'}
                onChange={e => setSystemConfig(c => ({
                  ...c,
                  bypassEmailVerification: e.target.checked ? 'true' : 'false',
                }))}
                style={{ marginTop: 4, accentColor: '#a855f7', cursor: 'pointer' }}
              />
              <span>
                <strong>Sari peste verificarea emailului la înregistrare</strong>
                <small style={{ display: 'block', color: '#666', marginTop: 4, fontWeight: 400 }}>
                  Bifat: conturile noi sunt active imediat, fără confirmare prin email.
                  Debifat (implicit): utilizatorul trebuie să confirme emailul înainte
                  de a se putea autentifica. Adresa "From" se ia din <code>SMTP_USER</code> (.env).
                </small>
              </span>
            </label>

            {systemConfig.bypassEmailVerification === 'true' && (
              <div style={{
                marginTop: -4, marginBottom: 12, padding: '6px 10px', borderRadius: 6,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#92400e', fontSize: 13,
              }}>
                ⚠️ Bypass activ: oricine poate crea cont cu orice email, fără confirmare.
              </div>
            )}

            <label style={labelStyle}>
              Zile înainte ca adminii să reconfirme un dispozitiv prin email
              <input
                type="number"
                min={-1}
                max={365}
                value={systemConfig.adminDeviceVerificationDays}
                onChange={e => setSystemConfig(c => ({ ...c, adminDeviceVerificationDays: e.target.value }))}
                placeholder="7"
                style={inputStyle}
              />
              <small style={{ display: 'block', color: '#666', marginTop: 4 }}>
                Dacă un admin nu se loghează pe acest dispozitiv în intervalul setat,
                următoarea autentificare îi va cere confirmare pe email. Implicit: 7 zile.
                {' '}<strong>-1</strong> = dezactivat complet. <strong>0</strong> = verificare la fiecare login.
              </small>
              {parseInt(systemConfig.adminDeviceVerificationDays, 10) === -1 && (
                <div style={{
                  marginTop: 8, padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: darkMode ? '#fbbf24' : '#92400e', fontSize: 12,
                }}>
                  ⚠ Verificarea de dispozitiv este <strong>dezactivată</strong>. Adminii se pot loga
                  de pe orice dispozitiv fără confirmare prin email.
                </div>
              )}
              {parseInt(systemConfig.adminDeviceVerificationDays, 10) === 0 && (
                <div style={{
                  marginTop: 8, padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(124, 58, 237, 0.15)',
                  border: '1px solid rgba(124, 58, 237, 0.4)',
                  color: darkMode ? '#c4b5fd' : '#5b21b6', fontSize: 12,
                }}>
                  🔒 Mod strict: adminii vor primi email de confirmare <strong>la fiecare login</strong>,
                  indiferent dacă dispozitivul e cunoscut.
                </div>
              )}
            </label>

            <label style={labelStyle}>
              Zile până când contul banat este șters automat
              <input
                type="number"
                min={1}
                max={365}
                value={systemConfig.banAutoDeleteDays}
                onChange={e => setSystemConfig(c => ({ ...c, banAutoDeleteDays: e.target.value }))}
                placeholder="14"
                style={inputStyle}
              />
              <small style={{ display: 'block', color: '#666', marginTop: 4 }}>
                După acest interval, contul banat este șters automat de sistem.
                Dacă utilizatorul depune un tichet de apel, ștergerea e suspendată
                până la soluționarea tichetului. Implicit: 14 zile.
              </small>
            </label>

            {configMsg && (
              <p style={{ color: configMsg.type === 'ok' ? '#155724' : '#b91c1c' }}>
                {configMsg.text}
              </p>
            )}
            <button type="submit" disabled={configSaving} style={btnPrimary}>
              {configSaving ? 'Se salvează...' : 'Salvează'}
            </button>
          </form>

          <hr style={{ border: 'none', borderTop: darkMode ? '1px solid rgba(168,85,247,0.2)' : '1px solid #e5e7eb', margin: '24px 0' }} />

          <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Întreținere</h2>
          <p style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#6b7280', margin: '0 0 12px' }}>
            Repornește procesul backend (echivalent cu „rs" în terminalul nodemon).
            Toate apelurile în curs vor fi întrerupte ~5 secunde până când supervizorul
            ridică procesul din nou.
          </p>
          <button onClick={restartServer} style={btnRestartServer}>
            ⟳ Repornește serverul
          </button>
        </div>
      )}

      {/* ── Modal „Șterge notița" (programare + acțiune autor) ── */}
      {delModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBoxStyle(darkMode), maxWidth: 540 }}>
            <h3 style={{ marginTop: 0 }}>Șterge notița</h3>
            <p style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#6b7280', marginTop: 0 }}>
              „{delModal.report.note.title}" — autor: <strong>{delModal.report.note.author.username}</strong>
            </p>

            <label style={labelStyle}>
              Termen până la ștergere (zile)
              <input
                type="number" min={1} max={365}
                value={delForm.days}
                onChange={e => setDelForm(f => ({ ...f, days: e.target.value }))}
                style={inputStyle}
              />
              <small style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                Notița e ascunsă imediat; se șterge efectiv după acest termen, doar
                dacă autorul nu depune un tichet de apel.
              </small>
            </label>

            <label style={labelStyle}>
              Motiv (vizibil pentru autor)
              <textarea
                rows={2}
                value={delForm.reason}
                onChange={e => setDelForm(f => ({ ...f, reason: e.target.value }))}
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                placeholder="Ex: Conținut nepotrivit pentru clasa a 9-a"
              />
            </label>

            <hr style={{ border: 'none', borderTop: darkMode ? '1px solid rgba(168,85,247,0.2)' : '1px solid #e5e7eb', margin: '16px 0' }} />

            <label style={labelStyle}>
              Acțiune asupra autorului
              <select
                value={delForm.userAction}
                onChange={e => setDelForm(f => ({ ...f, userAction: e.target.value }))}
                style={inputStyle}
              >
                <option value="NONE">Nu se întâmplă nimic</option>
                <option value="WARN">Avertizare utilizator</option>
                <option value="SUSPEND">Suspendă utilizator (ore)</option>
                <option value="BAN">🚫 Banează utilizator</option>
              </select>
            </label>

            {delForm.userAction === 'WARN' && (
              <label style={labelStyle}>
                Text avertisment (afișat utilizatorului)
                <textarea
                  rows={3}
                  required
                  value={delForm.warningText}
                  onChange={e => setDelForm(f => ({ ...f, warningText: e.target.value }))}
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                  placeholder="Ex: Conținutul tău nu respectă regulile. Te rugăm să citești ghidul."
                />
              </label>
            )}

            {delForm.userAction === 'SUSPEND' && (
              <label style={labelStyle}>
                Durată suspendare (ore)
                <input
                  type="number" min={1} max={8760}
                  value={delForm.suspendHours}
                  onChange={e => setDelForm(f => ({ ...f, suspendHours: e.target.value }))}
                  style={inputStyle}
                />
              </label>
            )}

            {delForm.userAction === 'BAN' && (
              <div style={{
                padding: 10, borderRadius: 6, fontSize: 13,
                background: darkMode ? 'rgba(220, 38, 38, 0.1)' : '#fee2e2',
                color: darkMode ? '#fca5a5' : '#991b1b',
                border: '1px solid rgba(220, 38, 38, 0.3)',
              }}>
                Contul va fi banat. Va fi șters automat după termenul setat de head admin
                dacă utilizatorul nu depune un apel.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setDelModal(null)} disabled={delSaving} style={btnSecondary}>
                Anulează
              </button>
              <button onClick={submitDeleteNote} disabled={delSaving || !delForm.reason || (delForm.userAction === 'WARN' && !delForm.warningText)} style={btnDeleteNote}>
                {delSaving ? 'Se trimite...' : 'Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editare ── */}
      {editTarget && (
        <div style={modalOverlay}>
          <div style={modalBoxStyle(darkMode)}>
            <h3 style={{ marginTop: 0 }}>
              {editTarget.type === 'user' ? 'Editează utilizator' : 'Editează notiță'}
            </h3>
            <form onSubmit={handleSave}>
              {editTarget.type === 'user' ? (
                <>
                  <Field label="Nume și prenume"  value={editForm.name}     onChange={field('name')} />
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

function TeachersPanel({ requests, codes, darkMode, onRefresh }) {
  const [section, setSection] = useState('requests');
  const [adminResponse, setAdminResponse] = useState({}); // requestId -> text
  const [busy, setBusy] = useState(null);

  // Generare cod
  const [newNote, setNewNote] = useState('');
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [newExpires, setNewExpires] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastCode, setLastCode] = useState(null);

  async function handleApprove(id) {
    setBusy(id);
    try {
      await api.post(`/admin/teacher-requests/${id}/approve`, {
        adminResponse: adminResponse[id] || undefined,
      });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la aprobare');
    } finally {
      setBusy(null);
    }
  }
  async function handleReject(id) {
    if (!adminResponse[id]?.trim()) {
      alert('Adaugă un motiv pentru respingere.');
      return;
    }
    setBusy(id);
    try {
      await api.post(`/admin/teacher-requests/${id}/reject`, {
        adminResponse: adminResponse[id],
      });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la respingere');
    } finally {
      setBusy(null);
    }
  }
  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setLastCode(null);
    try {
      const body = { note: newNote || undefined, maxUses: Number(newMaxUses) || 1 };
      if (newExpires) body.expiresAt = new Date(newExpires).toISOString();
      const { data } = await api.post('/admin/teacher-invite-codes', body);
      setLastCode(data);
      setNewNote(''); setNewMaxUses(1); setNewExpires('');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la generare');
    } finally {
      setGenerating(false);
    }
  }
  async function handleRevoke(id) {
    if (!confirm('Revoci codul? Nu mai poate fi folosit, dar înregistrările existente rămân.')) return;
    try {
      await api.delete(`/admin/teacher-invite-codes/${id}`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la revocare');
    }
  }

  const pending = requests.filter(r => r.status === 'PENDING');
  const handled = requests.filter(r => r.status !== 'PENDING');

  const backendOrigin = api.defaults.baseURL ? new URL(api.defaults.baseURL).origin : '';

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSection('requests')} style={section === 'requests' ? activeTab : tabBtn}>
          Cereri ({requests.length})
        </button>
        <button onClick={() => setSection('codes')} style={section === 'codes' ? activeTab : tabBtn}>
          Coduri invitație ({codes.length})
        </button>
      </div>

      {section === 'requests' && (
        <div>
          <h3 style={{ margin: '0 0 10px' }}>În așteptare ({pending.length})</h3>
          {pending.length === 0 ? (
            <p style={{ color: darkMode ? '#a89bc4' : '#6b7280' }}>Nicio cerere de procesat.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map(r => (
                <div key={r.id} style={requestCardStyle(darkMode)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <strong>{r.user.username}</strong>
                      <span style={{ marginLeft: 8, color: darkMode ? '#a89bc4' : '#6b7280', fontSize: 13 }}>
                        {r.user.email}
                      </span>
                      {r.user.school && (
                        <span style={{ marginLeft: 8, fontSize: 13 }}>• {r.user.school}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#6b7280' }}>
                      {new Date(r.createdAt).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                  <p style={{ margin: '10px 0', whiteSpace: 'pre-wrap', fontSize: 14 }}>
                    {r.message}
                  </p>
                  {r.documentUrl && (
                    <p style={{ margin: '4px 0 10px', fontSize: 13 }}>
                      📎{' '}
                      <a
                        href={backendOrigin + r.documentUrl}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: darkMode ? '#c9a8ff' : '#6366f1', fontWeight: 600 }}
                      >
                        Vezi documentul atașat
                      </a>
                    </p>
                  )}
                  <textarea
                    value={adminResponse[r.id] || ''}
                    onChange={e => setAdminResponse(prev => ({ ...prev, [r.id]: e.target.value }))}
                    rows={2}
                    placeholder="Mesaj pentru utilizator (obligatoriu la respingere, opțional la aprobare)"
                    style={textareaInline(darkMode)}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => handleApprove(r.id)} disabled={busy === r.id} style={approveBtn}>
                      ✓ Aprobă
                    </button>
                    <button onClick={() => handleReject(r.id)} disabled={busy === r.id} style={rejectBtn}>
                      ✗ Respinge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {handled.length > 0 && (
            <>
              <h3 style={{ margin: '24px 0 10px' }}>Procesate ({handled.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {handled.map(r => (
                  <div key={r.id} style={handledRowStyle(r.status, darkMode)}>
                    <strong>{r.user.username}</strong>
                    <span style={{ marginLeft: 8, fontSize: 12 }}>
                      {r.status === 'APPROVED' ? '✓ Aprobat' : '✗ Respins'}
                    </span>
                    {r.reviewedAt && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: darkMode ? '#a89bc4' : '#6b7280' }}>
                        {new Date(r.reviewedAt).toLocaleDateString('ro-RO')}
                      </span>
                    )}
                    {r.adminResponse && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: darkMode ? '#d4c8ff' : '#374151' }}>
                        „{r.adminResponse}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {section === 'codes' && (
        <div>
          <form onSubmit={handleGenerate} style={generateFormStyle(darkMode)}>
            <h3 style={{ margin: '0 0 10px' }}>Generează cod nou</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Descriere internă (ex: pentru profesorii de la CN X)"
                style={inputStyle}
              />
              <input
                type="number" min={1} max={1000}
                value={newMaxUses}
                onChange={e => setNewMaxUses(e.target.value)}
                placeholder="Folosiri max"
                style={inputStyle}
              />
              <input
                type="date"
                value={newExpires}
                onChange={e => setNewExpires(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={generating} style={btnPrimary}>
              {generating ? 'Se generează...' : 'Generează cod'}
            </button>
            {lastCode && (
              <div style={generatedCodeStyle(darkMode)}>
                <strong>Cod nou:</strong>{' '}
                <code style={{ fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' }}>
                  {lastCode.code}
                </code>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: darkMode ? '#a89bc4' : '#6b7280' }}>
                  Copiază-l și trimite-l profesorului. Apare în listă mai jos.
                </p>
              </div>
            )}
          </form>

          <h3 style={{ margin: '20px 0 10px' }}>Coduri existente</h3>
          {codes.length === 0 ? (
            <p style={{ color: darkMode ? '#a89bc4' : '#6b7280' }}>Niciun cod generat.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Cod</Th><Th>Descriere</Th><Th>Folosiri</Th>
                    <Th>Expiră</Th><Th>Status</Th><Th>Acțiuni</Th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(c => {
                    const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                    const exhausted = c.usedCount >= c.maxUses;
                    const status = c.revokedAt ? 'revocat' : expired ? 'expirat' : exhausted ? 'epuizat' : 'activ';
                    const statusColor =
                      status === 'activ'   ? (darkMode ? '#6ee7b7' : '#065f46') :
                      status === 'revocat' ? (darkMode ? '#fca5a5' : '#991b1b') :
                                             (darkMode ? '#a89bc4' : '#6b7280');
                    return (
                      <tr key={c.id}>
                        <Td>
                          <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.code}</code>
                        </Td>
                        <Td>{c.note || <Dash />}</Td>
                        <Td>{c.usedCount} / {c.maxUses}</Td>
                        <Td>
                          {c.expiresAt
                            ? new Date(c.expiresAt).toLocaleDateString('ro-RO')
                            : <Dash />}
                        </Td>
                        <Td>
                          <span style={{ color: statusColor, fontWeight: 600, fontSize: 12 }}>
                            {status}
                          </span>
                        </Td>
                        <Td>
                          {!c.revokedAt && (
                            <button onClick={() => handleRevoke(c.id)} style={btnRevokeStyle}>
                              Revocă
                            </button>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const requestCardStyle = (darkMode) => ({
  padding: 14, borderRadius: 8,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #e5e7eb',
  background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.7)',
});
const textareaInline = (darkMode) => ({
  width: '100%', padding: 8, borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #d1d5db',
  background: darkMode ? 'rgba(0,0,0,0.25)' : '#fff',
  color: darkMode ? '#e8e0ff' : '#222',
  resize: 'vertical', boxSizing: 'border-box',
});
const approveBtn = {
  padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: '#16a34a', color: 'white', border: 'none',
};
const rejectBtn = {
  padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: '#dc2626', color: 'white', border: 'none',
};
const handledRowStyle = (status, darkMode) => ({
  padding: '8px 12px', borderRadius: 6,
  background: status === 'APPROVED'
    ? (darkMode ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5')
    : (darkMode ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2'),
  borderLeft: status === 'APPROVED' ? '3px solid #16a34a' : '3px solid #dc2626',
});
const generateFormStyle = (darkMode) => ({
  padding: 14, borderRadius: 10,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #e5e7eb',
  background: darkMode ? 'rgba(20, 8, 50, 0.35)' : 'rgba(255, 255, 255, 0.6)',
});
const generatedCodeStyle = (darkMode) => ({
  marginTop: 12, padding: 12, borderRadius: 8,
  background: darkMode ? 'rgba(16, 185, 129, 0.12)' : '#d1fae5',
  border: darkMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #34d399',
  color: darkMode ? '#6ee7b7' : '#065f46',
});
const btnRevokeStyle = {
  padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  background: 'transparent', color: '#dc2626', border: '1px solid #dc2626',
};

const tableStyle   = { width: '100%', borderCollapse: 'collapse' };
const tabBtn       = { padding: '8px 18px', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: 4, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 14 };
const activeTab    = { ...tabBtn, background: '#7c3aed', color: 'white', border: '1px solid #7c3aed' };
const btnEditStyle = (darkMode) => ({
  padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #c4b5fd',
  background: darkMode ? 'rgba(168, 85, 247, 0.15)' : '#f5f3ff',
  color: darkMode ? '#e8ddff' : '#5b21b6',
});
const btnEdit      = { padding: '3px 8px', marginRight: 6, border: '1px solid #c4b5fd', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#f5f3ff', color: '#5b21b6' };
const btnDelete    = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#dc3545', color: 'white' };
const btnPromoteStyle = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#f59e0b', color: '#3b2a00', fontWeight: 600 };
const btnDemoteStyle  = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#64748b', color: 'white' };
const btnRestoreStyle = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#10b981', color: 'white', fontWeight: 500 };
const btnFalseReport  = { padding: '6px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#10b981', color: 'white', fontWeight: 600 };
const btnDeleteNote   = { padding: '6px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#dc2626', color: 'white', fontWeight: 600 };
const btnRestartServer = { padding: '10px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, background: '#dc2626', color: 'white', fontWeight: 600 };
const badgeBase    = { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500 };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBoxStyle = (darkMode) => ({
  background: darkMode ? '#1f1530' : 'white',
  color: darkMode ? '#e8e0ff' : '#222',
  padding: 24, borderRadius: 8, maxWidth: 460, width: '100%',
  margin: '0 16px', maxHeight: '90vh', overflowY: 'auto',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #e5e7eb',
});
const labelStyle   = { display: 'block', marginBottom: 12, fontWeight: 500 };
const inputStyle   = { display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ccc', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', background: 'transparent', color: 'inherit', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' };
