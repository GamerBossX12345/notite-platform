import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { useEditorSetup, TipTapEditor } from './TipTapEditor.jsx';

const SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];
const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

export function NoteEditForm({ note, onSaved, onCancel }) {
  const { darkMode } = useAuth();
  const { t } = useTranslation();
  const editor = useEditorSetup();
  const fileInputRef = useRef(null);

  const NOTE_TYPES = [
    { value: 'REZUMAT',           label: t('upload.noteTypeRezumat')   },
    { value: 'EXERCITII',         label: t('upload.noteTypeExercitii') },
    { value: 'FISA',              label: t('upload.noteTypeFisa')      },
    { value: 'HARTA_CONCEPTUALA', label: t('upload.noteTypeHarta')     },
    { value: 'FORMULE',           label: t('upload.noteTypeFormule')   },
  ];

  const [title, setTitle]           = useState(note.title || '');
  const [subject, setSubject]       = useState(note.subject || '');
  const [gradeLevel, setGradeLevel] = useState(note.gradeLevel || '');
  const [type, setType]             = useState(note.type || '');
  const [chapter, setChapter]       = useState(note.chapter || '');
  const [newFile, setNewFile]         = useState(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const [editorReady, setEditorReady] = useState(false);

  // Inițializează editorul cu conținutul existent imediat ce devine ready
  useEffect(() => {
    if (editor && !editorReady) {
      try {
        editor.commands.setContent(note.content || '', false);
      } catch { /* content invalid — lăsăm gol */ }
      setEditorReady(true);
    }
  }, [editor, editorReady, note.content]);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setNewFile(f);
    setRemoveExistingFile(false);
  }

  function clearNewFile() {
    setNewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('gradeLevel', gradeLevel);
      formData.append('type', type);
      formData.append('chapter', chapter || '');
      if (editor && !editor.isEmpty) {
        formData.append('content', JSON.stringify(editor.getJSON()));
      } else {
        formData.append('content', JSON.stringify({ type: 'doc', content: [] }));
      }
      if (newFile) {
        formData.append('file', newFile);
      } else if (removeExistingFile) {
        formData.append('removeFile', 'true');
      }

      const { data } = await api.put(`/notes/${note.id}`, formData);
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.error || t('common.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const existingFileName = note.fileUrl ? note.fileUrl.split('/').pop() : null;

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <label style={labelStyle}>
        {t('upload.titleField')}
        <input value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle(darkMode)} />
      </label>

      <label style={labelStyle}>
        {t('upload.subjectField')}
        <select value={subject} onChange={e => setSubject(e.target.value)} required style={inputStyle(darkMode)}>
          <option value="" disabled>—</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          {t('upload.gradeField')}
          <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} required style={inputStyle(darkMode)}>
            <option value="" disabled>—</option>
            {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          {t('upload.typeField')}
          <select value={type} onChange={e => setType(e.target.value)} required style={inputStyle(darkMode)}>
            <option value="" disabled>—</option>
            {NOTE_TYPES.map(nt => <option key={nt.value} value={nt.value}>{nt.label}</option>)}
          </select>
        </label>
      </div>

      <label style={labelStyle}>
        {t('upload.chapterField')}
        <input value={chapter} onChange={e => setChapter(e.target.value)} style={inputStyle(darkMode)} />
      </label>

      <div style={{ marginBottom: 16 }}>
        <span style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>{t('upload.contentField')}</span>
        <TipTapEditor editor={editor} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>{t('upload.fileField')}</span>
        {existingFileName && !newFile && !removeExistingFile && (
          <div style={fileBoxStyle(darkMode)}>
            <span style={{ flex: 1, fontSize: 14 }}>📎 {existingFileName}</span>
            <button type="button" onClick={() => setRemoveExistingFile(true)} style={removeBtnStyle(darkMode)}>
              {t('upload.removeFile')}
            </button>
          </div>
        )}
        {removeExistingFile && (
          <div style={{ ...fileBoxStyle(darkMode), borderStyle: 'dashed' }}>
            <span style={{ flex: 1, fontSize: 13, color: darkMode ? '#a89bc4' : '#888' }}>
              {t('upload.removeFile')}
            </span>
            <button type="button" onClick={() => setRemoveExistingFile(false)} style={removeBtnStyle(darkMode)}>
              {t('common.cancel')}
            </button>
          </div>
        )}
        {newFile && (
          <div style={fileBoxStyle(darkMode)}>
            <span style={{ flex: 1, fontSize: 14 }}>📎 {newFile.name}</span>
            <button type="button" onClick={clearNewFile} style={removeBtnStyle(darkMode)}>{t('common.cancel')}</button>
          </div>
        )}
        <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display: 'block', marginTop: 8, fontSize: 13 }} />
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: 12 }}>❌ {error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={btnPrimary(darkMode)}>
          {saving ? t('upload.submittingEdit') : t('upload.submitEdit')}
        </button>
        <button type="button" onClick={onCancel} style={btnSecondary(darkMode)}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
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

const fileBoxStyle = (darkMode) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 12px', borderRadius: 6,
  background: darkMode ? 'rgba(255, 255, 255, 0.04)' : '#fafafa',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid #e0e0e0',
});

const removeBtnStyle = (darkMode) => ({
  padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
  background: 'transparent',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #ccc',
  color: darkMode ? '#c9a8ff' : '#555',
});

const btnPrimary = (darkMode) => ({
  padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 500,
  background: darkMode ? 'rgba(120, 40, 200, 0.3)' : '#0066cc',
  color: darkMode ? '#c9a8ff' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.55)' : 'none',
});

const btnSecondary = (darkMode) => ({
  padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
  background: 'transparent',
  color: darkMode ? '#c9a8ff' : '#333',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #ccc',
});
