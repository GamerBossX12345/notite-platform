import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';
import { useEditorSetup, TipTapEditor } from '../components/TipTapEditor.jsx';
import { TagInput } from '../components/TagInput.jsx';

const NOTE_TYPES = [
  { value: 'REZUMAT',           label: 'Rezumat' },
  { value: 'EXERCITII',         label: 'Exerciții' },
  { value: 'FISA',              label: 'Fișă' },
  { value: 'HARTA_CONCEPTUALA', label: 'Hartă conceptuală' },
  { value: 'FORMULE',           label: 'Formule' },
];

const SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];
const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);
const MAX_FILE_MB  = 20;

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
].join(',');

const DRAFT_KEY = (userId) => `notita-draft-${userId}`;

export default function UploadPage() {
  const { user, loading, darkMode } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const editor = useEditorSetup();

  const [title, setTitle]           = useState('');
  const [subject, setSubject]       = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [chapter, setChapter]       = useState('');
  const [type, setType]             = useState('');
  const [tags, setTags]             = useState([]);
  const [file, setFile]             = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError]           = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successNoteId, setSuccessNoteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasDraft, setHasDraft]     = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // La mount: dacă există un draft pentru userul curent, afișează un banner.
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(DRAFT_KEY(user.id));
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        if (draft && (draft.title || draft.subject || draft.content)) {
          setHasDraft(true);
        }
      } catch { /* ignore */ }
    }
  }, [user]);

  function restoreDraft() {
    const raw = localStorage.getItem(DRAFT_KEY(user.id));
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      setTitle(d.title || '');
      setSubject(d.subject || '');
      setGradeLevel(d.gradeLevel || '');
      setChapter(d.chapter || '');
      setType(d.type || '');
      if (d.content && editor) editor.commands.setContent(d.content);
      setHasDraft(false);
      setDraftRestored(true);
    } catch { /* ignore */ }
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY(user.id));
    setHasDraft(false);
  }

  // Auto-save în localStorage. Salvăm pe schimbări de câmpuri + pe update-uri editor.
  function saveDraft() {
    if (!user || !editor || successNoteId) return;
    const hasAnything = title || subject || gradeLevel || chapter || type || !editor.isEmpty;
    if (!hasAnything) return;
    const draft = {
      title, subject, gradeLevel, chapter, type,
      content: editor.getJSON(),
      savedAt: new Date().toISOString(),
    };
    try { localStorage.setItem(DRAFT_KEY(user.id), JSON.stringify(draft)); } catch { /* quota */ }
  }

  useEffect(() => {
    const t = setTimeout(saveDraft, 400);
    return () => clearTimeout(t);
  }, [user, title, subject, gradeLevel, chapter, type, successNoteId]); // eslint-disable-line

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      // debounce simplu cu setTimeout pe fiecare modificare
      clearTimeout(onUpdate._t);
      onUpdate._t = setTimeout(saveDraft, 600);
    };
    editor.on('update', onUpdate);
    return () => { editor.off('update', onUpdate); clearTimeout(onUpdate._t); };
  }, [editor, user, title, subject, gradeLevel, chapter, type, successNoteId]); // eslint-disable-line

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    return () => { if (filePreview) URL.revokeObjectURL(filePreview); };
  }, [filePreview]);

  // Navighează spre notiță după ce popupul e vizibil 1.8s
  useEffect(() => {
    if (!successNoteId) return;
    const t = setTimeout(() => navigate(`/notes/${successNoteId}`), 1800);
    return () => clearTimeout(t);
  }, [successNoteId]);

  if (loading || !user) return <p>Se încarcă...</p>;

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Fișierul depășește limita de ${MAX_FILE_MB} MB.`);
      e.target.value = '';
      return;
    }
    setError(null);
    setFile(selected);
    setFilePreview(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null);
  }

  function removeFile() {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function openConfirm(e) {
    e.preventDefault();
    setError(null);

    const hasContent = editor && !editor.isEmpty;
    if (!hasContent && !file) {
      setError('Adaugă conținut în editor sau un fișier atașat.');
      return;
    }
    setConfirmOpen(true);
  }

  async function doSubmit() {
    setError(null);
    setConfirmOpen(false);
    const hasContent = editor && !editor.isEmpty;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('gradeLevel', gradeLevel);
      if (chapter) formData.append('chapter', chapter);
      formData.append('type', type);

      if (hasContent) {
        formData.append('content', JSON.stringify(editor.getJSON()));
      }
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));
      if (file) formData.append('file', file);

      const { data } = await api.post('/notes', formData);
      if (user) localStorage.removeItem(DRAFT_KEY(user.id));
      setSuccessNoteId(data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la salvare');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Popup succes */}
      {successNoteId && (
        <div style={successOverlay}>
          <div style={successBox(darkMode)}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>
              Notița a fost publicată!
            </h2>
            <p style={{ color: darkMode ? '#a89bc4' : '#666', margin: 0 }}>Te redirecționăm acum...</p>
          </div>
        </div>
      )}

      <h1>📝 Notiță nouă</h1>

      {hasDraft && (
        <div style={draftBannerStyle(darkMode)}>
          <div style={{ flex: 1 }}>
            <strong>💾 Ai o ciornă salvată.</strong>
            <span style={{ marginLeft: 6, fontSize: 13, opacity: 0.85 }}>
              Vrei să continui de unde ai rămas?
            </span>
          </div>
          <button type="button" onClick={restoreDraft} style={btnRestoreDraft}>Restaurează</button>
          <button type="button" onClick={discardDraft} style={btnDiscardDraft(darkMode)}>Ignoră</button>
        </div>
      )}

      {draftRestored && (
        <p style={{ fontSize: 13, color: darkMode ? '#86efac' : '#15803d', marginBottom: 12 }}>
          ✓ Ciorna a fost restaurată.
        </p>
      )}

      <form onSubmit={openConfirm}>

        <label style={labelStyle}>
          Titlu
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            required style={inputStyle(darkMode)} />
        </label>

        <label style={labelStyle}>
          Materie
          <select value={subject} onChange={e => setSubject(e.target.value)} required style={inputStyle(darkMode)}>
            <option value="" disabled>Selectează materia</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Clasa
            <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} required style={inputStyle(darkMode)}>
              <option value="" disabled>Selectează clasa</option>
              {GRADE_LEVELS.map(g => <option key={g} value={g}>a {g}-a</option>)}
            </select>
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Tip
            <select value={type} onChange={e => setType(e.target.value)} required style={inputStyle(darkMode)}>
              <option value="" disabled>Selectează tipul</option>
              {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Capitol <span style={{ color: '#888', fontWeight: 400 }}>(opțional)</span>
          <input type="text" value={chapter} onChange={e => setChapter(e.target.value)} style={inputStyle(darkMode)} />
        </label>

        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Tag-uri <span style={{ color: '#888', fontWeight: 400 }}>(opțional — ex: bac, examen, definiții, etc.)</span>
          </span>
          <TagInput value={tags} onChange={setTags} max={8} />
        </div>

        <label style={labelStyle}>
          Conținut
          <TipTapEditor editor={editor} />
        </label>

        {/* Fișier atașat */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Fișier atașat <span style={{ color: '#888', fontWeight: 400 }}>(opțional — imagini, PDF, Word, PowerPoint, Excel, max {MAX_FILE_MB} MB)</span>
          </span>
          {!file ? (
            <label style={dropZoneStyle}>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES}
                onChange={handleFileChange} style={{ display: 'none' }} />
              <span style={{ color: '#0066cc', cursor: 'pointer' }}>Alege fișier</span>
              <span style={{ color: '#999', marginLeft: 8 }}>sau trage aici</span>
            </label>
          ) : file.type === 'application/pdf' ? (
            <PdfPreviewCard file={file} onRemove={removeFile} darkMode={darkMode} />
          ) : (
            <div style={filePreviewContainerStyle}>
              {filePreview ? (
                <img src={filePreview} alt="previzualizare"
                  style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 6, display: 'block', marginBottom: 8 }} />
              ) : (
                <div style={{ fontSize: 32, marginBottom: 4 }}>📎</div>
              )}
              <p style={{ margin: 0, fontSize: 14, color: '#333' }}>{file.name}</p>
              <p style={{ margin: '2px 0 8px', fontSize: 12, color: '#888' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button type="button" onClick={removeFile} style={btnRemoveStyle}>Elimină fișier</button>
            </div>
          )}
        </div>

        {error && <p style={{ color: 'red', marginBottom: 12 }}>❌ {error}</p>}

        <div style={{ position: 'relative', display: 'inline-block' }}>
          {confirmOpen && (
            <div style={confirmPopoverStyle(darkMode)}>
              <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>
                Publici notița?
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.75 }}>
                Va fi vizibilă tuturor utilizatorilor.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setConfirmOpen(false)} style={confirmCancelBtn(darkMode)}>
                  Anulează
                </button>
                <button type="button" onClick={doSubmit} style={confirmOkBtn}>
                  Confirmă
                </button>
              </div>
              <div style={confirmArrowStyle(darkMode)} />
            </div>
          )}
          <button type="submit" disabled={submitting || !!successNoteId || confirmOpen} style={btnSubmitStyle}>
            {submitting ? 'Se publică...' : 'Publică notița'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PdfPreviewCard({ file, onRemove, darkMode }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const card = {
    borderRadius: 14,
    overflow: 'hidden',
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(0, 0, 0, 0.08)',
    background: darkMode ? 'rgba(20, 8, 50, 0.6)' : '#ffffff',
    boxShadow: darkMode
      ? '0 8px 32px rgba(80, 20, 160, 0.35), 0 2px 8px rgba(0,0,0,0.3)'
      : '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0,0,0,0.04)',
  };
  const header = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    borderBottom: darkMode ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(0, 0, 0, 0.06)',
    background: darkMode
      ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(59, 130, 246, 0.12) 100%)'
      : 'linear-gradient(135deg, rgba(244, 114, 182, 0.08) 0%, rgba(34, 211, 238, 0.08) 100%)',
    color: darkMode ? '#e8e0ff' : '#1a1a1a',
  };
  const removeBtn = {
    padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: darkMode ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid rgba(220, 38, 38, 0.4)',
    background: darkMode ? 'rgba(220, 38, 38, 0.15)' : 'rgba(254, 226, 226, 0.8)',
    color: darkMode ? '#fca5a5' : '#b91c1c',
  };
  return (
    <div style={card}>
      <div style={header}>
        <span style={{ fontSize: 20 }}>📄</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: 14,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{file.name}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
        <button type="button" onClick={onRemove} style={removeBtn}>Elimină</button>
      </div>
      {url && (
        <iframe
          src={`${url}#view=FitH&toolbar=1`}
          title="Previzualizare PDF"
          style={{ width: '100%', height: 480, border: 'none', display: 'block', background: darkMode ? '#1a0b2e' : '#f5f5f5' }}
        />
      )}
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: 16, fontWeight: 500 };
const inputStyle = (darkMode) => ({
  display: 'block', width: '100%', padding: 8, marginTop: 4,
  background: darkMode ? 'transparent' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});
const dropZoneStyle = {
  display: 'flex', alignItems: 'center', padding: '20px 16px',
  border: '2px dashed #ccc', borderRadius: 8, cursor: 'pointer',
};
const filePreviewContainerStyle = {
  padding: 16, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa',
};
const btnRemoveStyle = {
  padding: '4px 10px', background: 'white', border: '1px solid #ccc',
  borderRadius: 4, cursor: 'pointer', fontSize: 13, color: '#666',
};
const btnSubmitStyle = {
  padding: '10px 24px', background: '#0066cc', color: 'white',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15,
};
const successOverlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000,
  animation: 'fadeIn 0.2s ease',
};
const successBox = (darkMode) => ({
  background: darkMode ? 'rgba(20, 8, 50, 0.95)' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : 'none',
  backdropFilter: 'blur(14px)',
  borderRadius: 16,
  padding: '40px 48px',
  textAlign: 'center',
  boxShadow: darkMode
    ? '0 20px 60px rgba(120, 40, 200, 0.35)'
    : '0 20px 60px rgba(0,0,0,0.2)',
  animation: 'scaleIn 0.25s ease',
  color: darkMode ? '#e8e0ff' : '#222',
});

const confirmPopoverStyle = (darkMode) => ({
  position: 'absolute',
  bottom: 'calc(100% + 12px)',
  left: 0,
  width: 240,
  padding: '12px 14px',
  borderRadius: 10,
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : '#fff',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid #ccc',
  color: darkMode ? '#e8e0ff' : '#222',
  boxShadow: darkMode
    ? '0 8px 24px rgba(120, 40, 200, 0.35)'
    : '0 8px 24px rgba(0,0,0,0.15)',
  zIndex: 100,
  animation: 'scaleIn 0.15s ease',
});
const confirmArrowStyle = (darkMode) => ({
  position: 'absolute',
  bottom: -7,
  left: 24,
  width: 12, height: 12,
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : '#fff',
  borderRight: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid #ccc',
  borderBottom: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid #ccc',
  transform: 'rotate(45deg)',
});
const confirmOkBtn = {
  padding: '6px 14px', background: '#0066cc', color: 'white',
  border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
const draftBannerStyle = (darkMode) => ({
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  padding: '10px 14px', borderRadius: 8, marginBottom: 16,
  background: darkMode ? 'rgba(245, 158, 11, 0.12)' : '#fef3c7',
  border: darkMode ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid #fcd34d',
  color: darkMode ? '#fcd34d' : '#92400e',
});

const btnRestoreDraft = {
  padding: '6px 12px', background: '#7c3aed', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
const btnDiscardDraft = (darkMode) => ({
  padding: '6px 12px',
  background: 'transparent',
  color: darkMode ? '#fcd34d' : '#92400e',
  border: darkMode ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid #fcd34d',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
});

const confirmCancelBtn = (darkMode) => ({
  padding: '6px 14px',
  background: 'transparent',
  color: darkMode ? '#c9a8ff' : '#555',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #ccc',
  borderRadius: 5, cursor: 'pointer', fontSize: 13,
});
