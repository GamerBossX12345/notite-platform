// AdminPage — orchestrator subțire. Toate tab-urile sunt componente separate
// în [pages/admin/](./admin) ca să fie ușor de citit individual.
// Logica de stare + acțiuni rămâne aici și se transmite ca props copiilor.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';

import UsersTab from './admin/UsersTab.jsx';
import NotesTab from './admin/NotesTab.jsx';
import ReportsTab from './admin/ReportsTab.jsx';
import AppealsTab from './admin/AppealsTab.jsx';
import TeachersTab from './admin/TeachersTab.jsx';
import SystemTab from './admin/SystemTab.jsx';
import EditModal from './admin/EditModal.jsx';
import DeleteNoteModal from './admin/DeleteNoteModal.jsx';
import {
  REASON_LABEL,
  tabBtn, activeTab,
} from './admin/shared.jsx';

export default function AdminPage() {
  const { user, loading, darkMode } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [tab, setTab] = useState('users');
  const [users, setUsers]     = useState([]);
  const [notes, setNotes]     = useState([]);
  const [reports, setReports] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [appealDetail, setAppealDetail] = useState(null);
  const [appealResponse, setAppealResponse] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  const [teacherRequests, setTeacherRequests] = useState([]);
  const [inviteCodes, setInviteCodes]         = useState([]);

  const [systemConfig, setSystemConfig] = useState({ bypassEmailVerification: 'false', adminDeviceVerificationDays: '', banAutoDeleteDays: '' });
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg]       = useState(null);

  const [userQuery, setUserQuery]     = useState('');
  const [noteQuery, setNoteQuery]     = useState('');
  const [reportQuery, setReportQuery] = useState('');

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);

  const [delModal, setDelModal] = useState(null);
  const [delForm, setDelForm]   = useState({
    days: 7, reason: '',
    userAction: 'NONE',
    warningText: '',
    suspendHours: 48,
  });
  const [delSaving, setDelSaving] = useState(false);

  const isAdmin     = user?.role === 'ADMIN' || user?.role === 'HEAD_ADMIN';
  const isHeadAdmin = user?.role === 'HEAD_ADMIN';
  const pendingCount = reports.filter(r => r.status === 'PENDING').length;

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [loading, user, navigate, isAdmin]);

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
    if (!confirm(t('common.confirm') + '?')) return;
    try {
      await api.post('/admin/server/restart');
      setConfigMsg({ type: 'ok', text: t('common.success') });
    } catch (err) {
      setConfigMsg({ type: 'err', text: err.response?.data?.error || t('common.error') });
    }
  }

  async function saveSystemConfig(e) {
    e.preventDefault();
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      await api.patch('/admin/system-config', systemConfig);
      setConfigMsg({ type: 'ok', text: t('settings.saved') });
    } catch (err) {
      setConfigMsg({ type: 'err', text: err.response?.data?.error || t('common.saveError') });
    } finally {
      setConfigSaving(false);
    }
  }

  if (loading || dataLoading) return <p>{t('common.loading')}</p>;
  if (error) return <p style={{ color: 'red' }}>{t('common.error')}: {error}</p>;
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
      || q(r.reason || '').includes(s);
  });

  // ── Acțiuni utilizatori ──────────────────────────────────────────────────
  function openEditUser(u) {
    setEditTarget({ type: 'user', id: u.id });
    setEditForm({ name: u.name || '', email: u.email, username: u.username, school: u.school || '', grade: u.grade || '' });
  }

  async function deleteUser(id) {
    if (!confirm(t('settings.deleteAccountConfirm'))) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  }

  async function markReportFalse(r) {
    try {
      if (r.note.hidden) await api.post(`/admin/notes/${r.note.id}/unhide`);
      const { data } = await api.patch(`/admin/reports/${r.id}`, { status: 'RESOLVED' });
      setReports(prev => prev.map(x => x.id === r.id ? data : x));
      setNotes(prev => prev.map(n => n.id === r.note.id ? { ...n, hidden: false } : n));
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  }

  function openDeleteNoteModal(r) {
    setDelModal({ report: r });
    const reasonLabel = REASON_LABEL[r.reason] ? t(REASON_LABEL[r.reason]) : r.reason;
    setDelForm({
      days: 7,
      reason: `${reasonLabel}${r.details ? ` — ${r.details}` : ''}`,
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
      await api.post(`/admin/notes/${r.note.id}/schedule-deletion`, {
        days: Number(delForm.days),
        reason: delForm.reason,
      });

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

      await api.patch(`/admin/reports/${r.id}`, { status: 'RESOLVED' });

      const [u, n, rp] = await Promise.all([
        api.get('/admin/users'), api.get('/admin/notes'), api.get('/admin/reports'),
      ]);
      setUsers(u.data); setNotes(n.data); setReports(rp.data);

      setDelModal(null);
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setDelSaving(false);
    }
  }

  async function openAppealTicket(id) {
    try {
      const { data } = await api.post(`/admin/appeals/${id}/open`);
      setAppeals(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
      const detail = await api.get(`/admin/appeals/${id}`);
      setAppealDetail(detail.data);
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  }

  async function viewAppeal(id) {
    try {
      const { data } = await api.get(`/admin/appeals/${id}`);
      setAppealDetail(data);
      setAppealResponse('');
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  }

  async function resolveAppealTicket(id, resolution) {
    if (!confirm(t('common.confirm') + '?')) return;
    try {
      await api.post(`/admin/appeals/${id}/resolve`, { resolution, response: appealResponse });
      const [a, u] = await Promise.all([api.get('/admin/appeals'), api.get('/admin/users')]);
      setAppeals(a.data);
      setUsers(u.data);
      setAppealDetail(null);
      setAppealResponse('');
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  }

  async function setUserRole(targetUser, newRole) {
    if (!confirm(t('common.confirm') + '?')) return;
    try {
      const { data } = await api.post(`/admin/users/${targetUser.id}/set-role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: data.role } : u));
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  }

  // ── Acțiuni notițe ────────────────────────────────────────────────────────
  function openEditNote(n) {
    setEditTarget({ type: 'note', id: n.id });
    setEditForm({ title: n.title, subject: n.subject, gradeLevel: n.gradeLevel, type: n.type, chapter: n.chapter || '' });
  }

  async function deleteNote(id) {
    if (!confirm(t('note.confirmDelete'))) return;
    try {
      await api.delete(`/admin/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      setReports(prev => prev.filter(r => r.note.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  }

  async function deleteReport(id) {
    if (!confirm(t('common.confirm') + '?')) return;
    try {
      await api.delete(`/admin/reports/${id}`);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
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
      alert(err.response?.data?.error || t('common.error'));
    }
  }

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
      alert(err.response?.data?.error || t('common.saveError'));
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1>{t('admin.title')}</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        {users.length} • {notes.length} • {reports.length}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('users')} style={tab === 'users' ? activeTab : tabBtn}>
          {t('admin.tabUsers')} ({users.length})
        </button>
        <button onClick={() => setTab('notes')} style={tab === 'notes' ? activeTab : tabBtn}>
          {t('admin.tabNotes')} ({notes.length})
        </button>
        <button onClick={() => setTab('reports')} style={tab === 'reports' ? activeTab : tabBtn}>
          {t('admin.tabReports')} ({reports.length})
          {pendingCount > 0 && (
            <span style={{ marginLeft: 6, background: '#dc3545', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button onClick={() => setTab('appeals')} style={tab === 'appeals' ? activeTab : tabBtn}>
          {t('admin.tabAppeals')} ({appeals.length})
          {appeals.filter(a => a.status === 'PENDING').length > 0 && (
            <span style={{ marginLeft: 6, background: '#f59e0b', color: '#3b2a00', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>
              {appeals.filter(a => a.status === 'PENDING').length}
            </span>
          )}
        </button>
        {isHeadAdmin && (
          <button onClick={() => setTab('teachers')} style={tab === 'teachers' ? activeTab : tabBtn}>
            {t('admin.tabTeachers')}
            {teacherRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span style={{ marginLeft: 6, background: '#f59e0b', color: '#3b2a00', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>
                {teacherRequests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        )}
        {isHeadAdmin && (
          <button onClick={() => setTab('system')} style={tab === 'system' ? activeTab : tabBtn}>
            {t('admin.tabSystem')}
          </button>
        )}
      </div>

      {tab === 'users' && (
        <UsersTab
          users={users}
          filteredUsers={filteredUsers}
          userQuery={userQuery} setUserQuery={setUserQuery}
          user={user} isHeadAdmin={isHeadAdmin} darkMode={darkMode}
          openEditUser={openEditUser} setUserRole={setUserRole} deleteUser={deleteUser}
        />
      )}

      {tab === 'notes' && (
        <NotesTab
          filteredNotes={filteredNotes}
          noteQuery={noteQuery} setNoteQuery={setNoteQuery}
          darkMode={darkMode}
          openEditNote={openEditNote} unhideNote={unhideNote} deleteNote={deleteNote}
        />
      )}

      {tab === 'reports' && (
        <ReportsTab
          filteredReports={filteredReports}
          reportQuery={reportQuery} setReportQuery={setReportQuery}
          authorReportCount={authorReportCount}
          darkMode={darkMode}
          markReportFalse={markReportFalse}
          openDeleteNoteModal={openDeleteNoteModal}
          deleteReport={deleteReport}
        />
      )}

      {tab === 'appeals' && (
        <AppealsTab
          appeals={appeals}
          appealDetail={appealDetail} setAppealDetail={setAppealDetail}
          appealResponse={appealResponse} setAppealResponse={setAppealResponse}
          darkMode={darkMode}
          viewAppeal={viewAppeal} openAppealTicket={openAppealTicket}
          resolveAppealTicket={resolveAppealTicket}
        />
      )}

      {tab === 'teachers' && isHeadAdmin && (
        <TeachersTab
          requests={teacherRequests}
          codes={inviteCodes}
          darkMode={darkMode}
          onRefresh={refreshTeacherData}
        />
      )}

      {tab === 'system' && isHeadAdmin && (
        <SystemTab
          systemConfig={systemConfig} setSystemConfig={setSystemConfig}
          configSaving={configSaving} configMsg={configMsg}
          saveSystemConfig={saveSystemConfig} restartServer={restartServer}
          darkMode={darkMode}
        />
      )}

      {delModal && (
        <DeleteNoteModal
          delModal={delModal}
          delForm={delForm} setDelForm={setDelForm}
          delSaving={delSaving} submitDeleteNote={submitDeleteNote}
          onClose={() => setDelModal(null)}
          darkMode={darkMode}
        />
      )}

      {editTarget && (
        <EditModal
          editTarget={editTarget}
          editForm={editForm} setEditForm={setEditForm}
          saving={saving} handleSave={handleSave}
          onClose={() => setEditTarget(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
