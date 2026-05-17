import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';

const SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];
const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

export default function SettingsPage() {
  const { user, loading, logout, darkMode } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('profile');

  const [formData, setFormData] = useState({
    name: '', email: '', username: '', school: '', grade: '', bio: '',
  });
  const [showName, setShowName]   = useState(true);
  const [showSchool, setShowSchool] = useState(true);
  const [showGrade, setShowGrade]   = useState(true);

  const [notifyOnRating, setNotifyOnRating]   = useState(true);
  const [notifyOnComment, setNotifyOnComment] = useState(true);
  const [notifyOnReport, setNotifyOnReport]   = useState(true);

  const [defaultSubject, setDefaultSubject]       = useState('');
  const [defaultGradeLevel, setDefaultGradeLevel] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError]     = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError]       = useState('');
  const [deletePassword, setDeletePassword]   = useState('');
  const [deleting, setDeleting]               = useState(false);
  const [deleteError, setDeleteError]         = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      school: user.school || '',
      grade: user.grade || '',
      bio: user.bio || '',
    });
    setShowName(user.showName ?? true);
    setShowSchool(user.showSchool ?? true);
    setShowGrade(user.showGrade ?? true);
    setNotifyOnRating(user.notifyOnRating ?? true);
    setNotifyOnComment(user.notifyOnComment ?? true);
    setNotifyOnReport(user.notifyOnReport ?? true);
    setDefaultSubject(user.defaultSubject || '');
    // Dacă userul nu și-a setat explicit clasa implicită, folosim clasa de la
    // înregistrare ca valoare prepopulată. Userul poate schimba la "Toate clasele".
    setDefaultGradeLevel(
      user.defaultGradeLevel != null
        ? String(user.defaultGradeLevel)
        : (user.grade != null ? String(user.grade) : '')
    );
  }, [user]);

  if (loading || !user) return <p>Se încarcă...</p>;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const sensitiveChanged =
    formData.email !== (user?.email || '') ||
    formData.username !== (user?.username || '');

  function flashSaved(key) {
    setSaved(key);
    setTimeout(() => setSaved(''), 2500);
  }

  async function handleSaveProfile() {
    setConfirmError('');
    if (sensitiveChanged && !confirmPassword) {
      setConfirmError('Introduceți parola pentru a confirma schimbarea emailului sau username-ului.');
      return;
    }
    setSaving(true);
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
      flashSaved('profile');
      setConfirmPassword('');
    } catch (err) {
      setConfirmError(err.response?.data?.error || 'Eroare la salvare');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrivacy() {
    setSaving(true);
    try {
      await api.patch('/auth/settings', { showName, showSchool, showGrade });
      flashSaved('privacy');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotifications() {
    setSaving(true);
    try {
      await api.patch('/auth/settings', { notifyOnRating, notifyOnComment, notifyOnReport });
      flashSaved('notifications');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveHomepage() {
    setSaving(true);
    try {
      await api.patch('/auth/settings', {
        defaultSubject: defaultSubject || null,
        defaultGradeLevel: defaultGradeLevel ? Number(defaultGradeLevel) : null,
      });
      flashSaved('homepage');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError('');
    if (!currentPassword || !newPassword) {
      setPasswordError('Completează ambele câmpuri de parolă.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Parola nouă trebuie să aibă minim 8 caractere.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Parola nouă și confirmarea nu se potrivesc.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      flashSaved('password');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Eroare la schimbarea parolei');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setDeleteError('Introduceți parola pentru confirmare');
      return;
    }
    if (!window.confirm('Ești sigur? Ștergerea contului este permanentă și nu poate fi anulată.')) return;

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
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Setări cont</h1>

      <div style={layoutStyle}>
        <nav style={tabsStyle(darkMode)}>
          <TabBtn active={tab === 'profile'}      onClick={() => setTab('profile')}      label="Profil" />
          <TabBtn active={tab === 'privacy'}      onClick={() => setTab('privacy')}      label="Confidențialitate" />
          <TabBtn active={tab === 'notifications'} onClick={() => setTab('notifications')} label="Notificări"         />
          <TabBtn active={tab === 'homepage'}     onClick={() => setTab('homepage')}     label="Homepage"          />
          <TabBtn active={tab === 'teacher'}      onClick={() => setTab('teacher')}      label="Profesor"          />
          <TabBtn active={tab === 'password'}     onClick={() => setTab('password')}     label="Parolă" />
          <TabBtn active={tab === 'danger'}       onClick={() => setTab('danger')}       label="Pericol" danger />
        </nav>
        <div style={{ flex: 1, minWidth: 0 }}>

      {/* PROFIL */}
      {tab === 'profile' && (
        <div style={sectionStyle(darkMode)}>
          <h2 style={sectionTitleStyle(darkMode)}>Date profil</h2>
          <p style={mutedStyle(darkMode)}>Actualizează informațiile tale personale.</p>

          <Field label="Nume"   name="name"     value={formData.name}     onChange={handleInputChange} placeholder="Ex: Ion Popescu" />
          <Field label="Email"  name="email"    value={formData.email}    onChange={handleInputChange} type="email" placeholder="Ex: ion@example.com" />
          <Field label="Username" name="username" value={formData.username} onChange={handleInputChange} placeholder="Ex: ionpop" />
          <Field label="Școală" name="school"   value={formData.school}   onChange={handleInputChange} placeholder="Ex: Colegiul Național X" />
          <Field label="Clasa"  name="grade"    value={formData.grade}    onChange={handleInputChange} type="number" min="5" max="12" />

          <div style={formGroupStyle}>
            <label style={labelStyle(darkMode)}>Bio</label>
            <textarea
              name="bio" value={formData.bio} onChange={handleInputChange}
              style={{ ...inputStyle(darkMode), minHeight: 80, resize: 'vertical' }}
              placeholder="Câteva cuvinte despre tine..."
            />
          </div>

          {sensitiveChanged && (
            <div style={warnBoxStyle}>
              <label style={{ ...labelStyle(darkMode), color: '#fbbf24' }}>
                ⚠ Ai modificat emailul sau username-ul. Confirmă cu parola ta:
              </label>
              <input
                type="password" value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                style={inputStyle(darkMode)} placeholder="Parola ta"
              />
            </div>
          )}

          {confirmError && <p style={errorStyle}>❌ {confirmError}</p>}

          <SaveBtn onClick={handleSaveProfile} saving={saving} saved={saved === 'profile'} label="Salvează profil" />
        </div>
      )}

      {/* CONFIDENȚIALITATE */}
      {tab === 'privacy' && (
        <div style={sectionStyle(darkMode)}>
          <h2 style={sectionTitleStyle(darkMode)}>Confidențialitate profil</h2>
          <p style={mutedStyle(darkMode)}>Alege ce informații sunt vizibile public pe pagina ta de profil.</p>

          <Toggle
            checked={showName} onChange={setShowName}
            title="Afișează numele real"
            desc={formData.name ? `Pe profil va apărea "${formData.name}" în loc de "@${formData.username}"` : 'Nu ai un nume setat — va apărea username-ul'}
          />
          <Toggle
            checked={showSchool} onChange={setShowSchool}
            title="Afișează școala"
            desc={formData.school ? `Vizibil: "${formData.school}"` : 'Nu ai școala setată'}
          />
          <Toggle
            checked={showGrade} onChange={setShowGrade}
            title="Afișează clasa"
            desc={formData.grade ? `Vizibil: clasa a ${formData.grade}-a` : 'Nu ai clasa setată'}
          />

          <SaveBtn onClick={handleSavePrivacy} saving={saving} saved={saved === 'privacy'} label="Salvează" />
        </div>
      )}

      {/* NOTIFICĂRI */}
      {tab === 'notifications' && (
        <div style={sectionStyle(darkMode)}>
          <h2 style={sectionTitleStyle(darkMode)}>Notificări</h2>
          <p style={mutedStyle(darkMode)}>Alege pentru ce evenimente vrei să primești notificări.</p>

          <Toggle
            checked={notifyOnRating} onChange={setNotifyOnRating}
            title="Rating-uri noi"
            desc="Când cineva votează una dintre notițele tale"
          />
          <Toggle
            checked={notifyOnComment} onChange={setNotifyOnComment}
            title="Comentarii noi"
            desc="Când cineva comentează la una dintre notițele tale"
          />
          <Toggle
            checked={notifyOnReport} onChange={setNotifyOnReport}
            title="Raportări"
            desc="Când o notiță de-a ta este raportată sau ascunsă"
          />

          <SaveBtn onClick={handleSaveNotifications} saving={saving} saved={saved === 'notifications'} label="Salvează" />
        </div>
      )}

      {/* HOMEPAGE */}
      {tab === 'homepage' && (
        <div style={sectionStyle(darkMode)}>
          <h2 style={sectionTitleStyle(darkMode)}>Preferințe homepage</h2>
          <p style={mutedStyle(darkMode)}>
            Setează filtre implicite pentru pagina principală — vor fi aplicate automat când intri în site.
          </p>

          <div style={formGroupStyle}>
            <label style={labelStyle(darkMode)}>Materie implicită</label>
            <select value={defaultSubject} onChange={e => setDefaultSubject(e.target.value)} style={inputStyle(darkMode)}>
              <option value="">— Toate materiile —</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle(darkMode)}>Clasă implicită</label>
            <select value={defaultGradeLevel} onChange={e => setDefaultGradeLevel(e.target.value)} style={inputStyle(darkMode)}>
              <option value="">— Toate clasele —</option>
              {GRADE_LEVELS.map(g => <option key={g} value={g}>a {g}-a</option>)}
            </select>
            {user.grade && (
              <small style={{ display: 'block', marginTop: 6, fontSize: 12, color: darkMode ? '#999' : '#666' }}>
                Implicit: clasa de la înregistrare (a {user.grade}-a). Selectează "Toate clasele" dacă vrei să vezi tot.
              </small>
            )}
          </div>

          <SaveBtn onClick={handleSaveHomepage} saving={saving} saved={saved === 'homepage'} label="Salvează" />
        </div>
      )}

      {/* PROFESOR */}
      {tab === 'teacher' && (
        <TeacherTab darkMode={darkMode} user={user} />
      )}


      {/* PAROLĂ */}
      {tab === 'password' && (
        <div style={sectionStyle(darkMode)}>
          <h2 style={sectionTitleStyle(darkMode)}>Schimbare parolă</h2>
          <p style={mutedStyle(darkMode)}>Alege o parolă nouă (minim 8 caractere).</p>

          <div style={formGroupStyle}>
            <label style={labelStyle(darkMode)}>Parola actuală</label>
            <input type="password" value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setPasswordError(''); }} style={inputStyle(darkMode)} />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle(darkMode)}>Parola nouă</label>
            <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }} style={inputStyle(darkMode)} />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle(darkMode)}>Confirmă parola nouă</label>
            <input type="password" value={confirmNewPassword} onChange={e => { setConfirmNewPassword(e.target.value); setPasswordError(''); }} style={inputStyle(darkMode)} />
          </div>

          {passwordError && <p style={errorStyle}>❌ {passwordError}</p>}

          <SaveBtn onClick={handleChangePassword} saving={saving} saved={saved === 'password'} label="Schimbă parola" />
        </div>
      )}

      {/* PERICOL */}
      {tab === 'danger' && (
        <div style={dangerSectionStyle(darkMode)}>
          <h2 style={dangerTitleStyle(darkMode)}>Ștergere cont</h2>
          <p style={dangerWarnStyle(darkMode)}>
            <strong>Atenție!</strong> Ștergerea contului este permanentă. Toate notițele, comentariile și datele vor fi șterse.
          </p>

          <div style={formGroupStyle}>
            <label style={labelStyle(darkMode)}>Introduceți parola pentru confirmare:</label>
            <input
              type="password" value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              style={inputStyle(darkMode)} placeholder="Parola ta" disabled={deleting}
            />
          </div>

          {deleteError && <p style={{ color: darkMode ? '#ff6666' : '#b91c1c', fontSize: 14, marginBottom: 12 }}>❌ {deleteError}</p>}

          <button
            onClick={handleDeleteAccount} disabled={deleting}
            style={dangerBtnStyle(darkMode, deleting)}
          >
            {deleting ? 'Se șterge...' : '🗑 Șterge permanent contul'}
          </button>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

function TeacherTab({ darkMode, user }) {
  const { refreshMe } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('code'); // 'code' | 'document'

  // Stare pentru cod
  const [code, setCode] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');

  // Stare pentru cerere cu document
  const [message, setMessage] = useState('');
  const [docFile, setDocFile] = useState(null);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/teacher-request/me')
      .then(res => setRequest(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRedeemCode(e) {
    e.preventDefault();
    setCodeError('');
    setCodeSuccess('');
    if (!code.trim()) {
      setCodeError('Introdu un cod.');
      return;
    }
    setCodeSubmitting(true);
    try {
      await api.post('/auth/teacher-invite/redeem', { code: code.trim() });
      setCodeSuccess('✓ Cont activat ca profesor verificat.');
      setCode('');
      if (refreshMe) refreshMe();
    } catch (err) {
      setCodeError(err.response?.data?.error || 'Cod invalid');
    } finally {
      setCodeSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (message.trim().length < 30) {
      setError('Mesajul trebuie să aibă cel puțin 30 de caractere.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('message', message);
      if (docFile) formData.append('document', docFile);
      const res = await api.post('/auth/teacher-request', formData);
      setRequest(res.data);
      setMessage('');
      setDocFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la trimitere');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Se încarcă...</p>;

  if (user.isTeacher) {
    const methodLabel = {
      EMAIL_DOMAIN: 'email instituțional (.edu / .gov.ro / etc.)',
      INVITE_CODE:  'cod de invitație',
      DOCUMENT:     'document de identitate aprobat de admin',
      MANUAL:       'aprobare directă de la head admin',
    }[user.teacherVerificationMethod] || 'aprobare admin';
    return (
      <div style={sectionStyle(darkMode)}>
        <h2 style={sectionTitleStyle(darkMode)}>✓ Profesor verificat</h2>
        <p style={mutedStyle(darkMode)}>
          Contul tău are statut de profesor verificat. Notițele tale apar cu badge ✓ verde
          lângă username și poți evalua sau corecta notițele altora.
        </p>
        <p style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#666' }}>
          Metodă: {methodLabel}.
        </p>
        {user.teacherVerifiedAt && (
          <p style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#666' }}>
            Verificat din: {new Date(user.teacherVerifiedAt).toLocaleDateString('ro-RO')}
          </p>
        )}
      </div>
    );
  }

  const statusLabels = {
    PENDING:  { text: '⏳ În așteptare', color: '#f59e0b' },
    REJECTED: { text: '❌ Respinsă',     color: '#dc2626' },
    APPROVED: { text: '✅ Aprobată',     color: '#16a34a' },
  };

  if (request && request.status === 'PENDING') {
    return (
      <div style={sectionStyle(darkMode)}>
        <h2 style={sectionTitleStyle(darkMode)}>Cerere profesor</h2>
        <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)', marginBottom: 12 }}>
          <strong style={{ color: statusLabels.PENDING.color }}>{statusLabels.PENDING.text}</strong>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: darkMode ? '#d4c8ff' : '#222' }}>
            Cererea ta este în analiza head admin-ului. Vei vedea răspunsul aici când e procesată.
          </p>
        </div>
        <div style={{ fontSize: 12, color: darkMode ? '#867aa3' : '#888', marginBottom: 6 }}>Mesajul trimis:</div>
        <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: darkMode ? '#d4c8ff' : '#222' }}>{request.message}</p>
        {request.documentUrl && (
          <p style={{ marginTop: 8, fontSize: 13 }}>
            📎 <a href={request.documentUrl} target="_blank" rel="noopener noreferrer"
                 style={{ color: darkMode ? '#c9a8ff' : '#6366f1' }}>
              Documentul atașat
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={sectionStyle(darkMode)}>
      <h2 style={sectionTitleStyle(darkMode)}>Devino profesor verificat</h2>
      <p style={mutedStyle(darkMode)}>
        Profesorii verificați pot evalua notițele cu ✓ / ✗, le pot edita pentru a corecta
        greșeli, și apar cu badge ✓ verde lângă nume. Există trei căi de verificare:
        emailul instituțional (<code>.edu</code> etc. — automat la înregistrare), un cod de
        invitație, sau o cerere cu document de identitate.
      </p>

      {/* Selector între cele două opțiuni */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setMode('code')}
                style={modeBtn(mode === 'code', darkMode)}>
          🔑 Am un cod de invitație
        </button>
        <button type="button" onClick={() => setMode('document')}
                style={modeBtn(mode === 'document', darkMode)}>
          📄 Trimit o cerere cu document
        </button>
      </div>

      {mode === 'code' && (
        <form onSubmit={handleRedeemCode}>
          <p style={{ fontSize: 14, color: darkMode ? '#d4c8ff' : '#222', marginBottom: 10 }}>
            Introdu codul primit de la administratorul platformei. Codurile au format
            de 12 caractere (litere mari + cifre).
          </p>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(''); setCodeSuccess(''); }}
            placeholder="ABCD-2345-WXYZ"
            maxLength={32}
            style={{
              ...inputStyle(darkMode),
              fontFamily: 'monospace', letterSpacing: 2, fontSize: 16,
            }}
          />
          {codeError && <p style={errorStyle}>❌ {codeError}</p>}
          {codeSuccess && <p style={{ color: '#16a34a', fontSize: 14, marginTop: 8 }}>{codeSuccess}</p>}
          <SaveBtn onClick={handleRedeemCode} saving={codeSubmitting} label="Activează" />
        </form>
      )}

      {mode === 'document' && (
        <form onSubmit={handleSubmit}>
          {request && request.status === 'REJECTED' && (
            <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', marginBottom: 12 }}>
              <strong style={{ color: statusLabels.REJECTED.color }}>Cererea precedentă a fost respinsă.</strong>
              {request.adminResponse && (
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>Motiv: {request.adminResponse}</p>
              )}
              <p style={{ margin: '6px 0 0', fontSize: 12, color: darkMode ? '#a89bc4' : '#666' }}>
                Poți trimite o nouă cerere mai jos.
              </p>
            </div>
          )}
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Descrie școala/instituția unde predai, materia, ani de experiență, eventual un link spre o pagină oficială unde apari..."
            rows={6}
            minLength={30}
            maxLength={3000}
            required
            style={{ ...inputStyle(darkMode), minHeight: 120, resize: 'vertical', marginBottom: 8 }}
          />
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...labelStyle(darkMode), fontSize: 13 }}>
              Document (diplomă, legitimație, etc.) — opțional dar recomandat
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={e => setDocFile(e.target.files?.[0] || null)}
              style={{ display: 'block', fontSize: 13 }}
            />
            {docFile && (
              <p style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#666', marginTop: 4 }}>
                📎 {docFile.name}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#666' }}>{message.length} / 3000</span>
            {error && <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>}
          </div>
          <SaveBtn onClick={handleSubmit} saving={submitting} label="Trimite cererea" />
        </form>
      )}
    </div>
  );
}

function modeBtn(active, darkMode) {
  return {
    padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    border: active
      ? (darkMode ? '1px solid #a855f7' : '1px solid #be185d')
      : (darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #d1d5db'),
    background: active
      ? (darkMode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(244, 114, 182, 0.1)')
      : 'transparent',
    color: active
      ? (darkMode ? '#e8d4ff' : '#be185d')
      : (darkMode ? '#c9a8ff' : '#374151'),
  };
}

// ── Componente reutilizabile ─────────────────────────────────────────────────
function TabBtn({ active, onClick, label, danger }) {
  const { darkMode } = useAuth();
  const dangerActive   = darkMode ? '#ff4444' : '#dc2626';
  const dangerInactive = darkMode ? '#ff6666' : '#ef4444';
  const style = active
    ? (danger
        ? { ...activeTabStyle(darkMode), color: dangerActive, borderBottomColor: dangerActive }
        : activeTabStyle(darkMode))
    : (danger
        ? { ...inactiveTabStyle(darkMode), color: dangerInactive }
        : inactiveTabStyle(darkMode));
  return <button onClick={onClick} style={style}>{label}</button>;
}

function Field({ label, ...rest }) {
  const { darkMode } = useAuth();
  return (
    <div style={formGroupStyle}>
      <label style={labelStyle(darkMode)}>{label}</label>
      <input style={inputStyle(darkMode)} {...rest} />
    </div>
  );
}

function Toggle({ checked, onChange, title, desc }) {
  const { darkMode } = useAuth();
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      borderRadius: 8, cursor: 'pointer', marginBottom: 10,
      border: darkMode ? '1px solid rgba(100, 60, 160, 0.2)' : '1px solid rgba(244, 114, 182, 0.25)',
      background: checked
        ? (darkMode ? 'rgba(120, 40, 200, 0.08)' : 'rgba(244, 114, 182, 0.1)')
        : 'transparent',
      transition: 'background 0.2s ease, border-color 0.2s ease',
    }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: darkMode ? '#a855f7' : '#ec4899', marginTop: 3 }} />
      <div>
        <strong style={{ color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>{title}</strong>
        <span style={{ display: 'block', fontSize: 13, color: darkMode ? '#999' : '#666', marginTop: 2 }}>{desc}</span>
      </div>
    </label>
  );
}

function SaveBtn({ onClick, saving, saved, label }) {
  const { darkMode } = useAuth();
  return (
    <button onClick={onClick} disabled={saving} style={saving ? { ...btnStyle(darkMode), opacity: 0.6 } : btnStyle(darkMode)}>
      {saving ? 'Se salvează...' : saved ? '✓ Salvat!' : label}
    </button>
  );
}

// ── Stiluri ──────────────────────────────────────────────────────────────────
// Layout cu coloana de tab-uri în stânga și conținut în dreapta.
const layoutStyle = {
  display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap',
};
const tabsStyle = (darkMode) => ({
  display: 'flex', flexDirection: 'column', gap: 4,
  width: 200, flexShrink: 0,
  borderRight: darkMode ? '1px solid rgba(100, 60, 160, 0.2)' : '1px solid rgba(244, 114, 182, 0.25)',
  paddingRight: 12,
});
const activeTabStyle = (darkMode) => ({
  padding: '10px 14px', background: 'transparent',
  border: 'none',
  borderLeft: darkMode ? '3px solid rgba(168, 85, 247, 0.8)' : '3px solid #be185d',
  color: darkMode ? '#a855f7' : '#be185d',
  cursor: 'pointer', fontSize: 14, fontWeight: 600,
  textAlign: 'left', width: '100%',
});
const inactiveTabStyle = (darkMode) => ({
  padding: '10px 14px', background: 'transparent',
  border: 'none',
  borderLeft: '3px solid transparent',
  color: darkMode ? '#888' : '#888',
  cursor: 'pointer', fontSize: 14,
  textAlign: 'left', width: '100%',
});
const sectionStyle = (darkMode) => ({
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.25)' : '1px solid rgba(244, 114, 182, 0.3)',
  borderRadius: 12, padding: 24,
  background: darkMode ? 'rgba(20, 10, 40, 0.6)' : 'rgba(255, 255, 255, 0.7)',
  transition: 'background 0.4s ease, border-color 0.4s ease',
});
const sectionTitleStyle = (darkMode) => ({
  marginBottom: 12, fontSize: 18,
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
});
const mutedStyle = (darkMode) => ({
  marginBottom: 20, fontSize: 14,
  color: darkMode ? '#aaa' : '#666',
});
const formGroupStyle = { marginBottom: 16 };
const labelStyle = (darkMode) => ({
  display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6,
  color: darkMode ? '#d0c8e8' : '#222',
});
const inputStyle = (darkMode) => ({
  display: 'block', width: '100%', padding: 10, boxSizing: 'border-box',
  background: darkMode ? 'rgba(0, 0, 0, 0.3)' : '#fff',
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.25)' : '1px solid rgba(244, 114, 182, 0.4)',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 6, fontSize: 14,
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});
const warnBoxStyle = {
  ...formGroupStyle, marginTop: 8, padding: '12px 14px', borderRadius: 8,
  border: '1px solid rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.07)',
};
const errorStyle = { color: '#ff6666', fontSize: 14, marginTop: 8, marginBottom: 0 };
const btnStyle = (darkMode) => ({
  marginTop: 20, padding: '10px 24px',
  background: darkMode ? 'rgba(120, 40, 200, 0.7)' : 'linear-gradient(135deg, #f472b6 0%, #22d3ee 100%)',
  color: 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 15, fontWeight: 600,
  transition: 'background 0.4s ease, border-color 0.4s ease',
});

// Danger zone — mai rosu in light mode
const dangerSectionStyle = (darkMode) => ({
  border: darkMode ? '1px solid rgba(255, 68, 68, 0.2)' : '1px solid rgba(220, 38, 38, 0.5)',
  borderRadius: 12, padding: 24,
  background: darkMode ? 'rgba(255, 20, 20, 0.08)' : 'rgba(254, 226, 226, 0.8)',
  transition: 'background 0.4s ease, border-color 0.4s ease',
});
const dangerTitleStyle = (darkMode) => ({
  marginBottom: 12, fontSize: 18,
  color: darkMode ? '#ff6666' : '#b91c1c',
});
const dangerWarnStyle = (darkMode) => ({
  marginBottom: 20, fontSize: 14,
  color: darkMode ? '#ff9999' : '#991b1b',
});
const dangerBtnStyle = (darkMode, deleting) => ({
  padding: '10px 24px',
  background: deleting
    ? (darkMode ? 'rgba(255, 68, 68, 0.5)' : 'rgba(220, 38, 38, 0.5)')
    : (darkMode ? 'rgba(255, 68, 68, 0.8)' : '#dc2626'),
  color: 'white',
  border: darkMode ? '1px solid #ff4444' : '1px solid #b91c1c',
  borderRadius: 6,
  cursor: deleting ? 'default' : 'pointer',
  fontSize: 15, fontWeight: 600,
});
