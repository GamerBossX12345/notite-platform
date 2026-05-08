import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';
import { useEditorSetup, TipTapEditor } from '../components/TipTapEditor.jsx';

const NOTE_TYPES = [
  { value: 'REZUMAT',          label: 'Rezumat' },
  { value: 'EXERCITII',        label: 'Exerciții' },
  { value: 'FISA',             label: 'Fișă' },
  { value: 'HARTA_CONCEPTUALA', label: 'Hartă conceptuală' },
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

export default function UploadPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const editor = useEditorSetup();

  const [title, setTitle]           = useState('');
  const [subject, setSubject]       = useState('');
  const [gradeLevel, setGradeLevel] = useState(9);
  const [chapter, setChapter]       = useState('');
  const [type, setType]             = useState('REZUMAT');
  const [file, setFile]             = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError]           = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    return () => { if (filePreview) URL.revokeObjectURL(filePreview); };
  }, [filePreview]);

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
    if (selected.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(selected));
    } else {
      setFilePreview(null);
    }
  }

  function removeFile() {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!editor?.getHTML().trim() && !file) {
      setError('Adaugă conținut în editor sau un fișier atașat.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('gradeLevel', gradeLevel);
      if (chapter) formData.append('chapter', chapter);
      formData.append('type', type);

      // Trimite HTML din editor
      if (editor?.getHTML().trim()) {
        formData.append('content', editor.getHTML());
      }

      if (file) formData.append('file', file);

      const { data } = await api.post('/notes', formData);
      navigate(`/notes/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la salvare');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1>📝 Notiță nouă</h1>
      <form onSubmit={handleSubmit}>

        <label style={labelStyle}>
          Titlu
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Materie
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
            placeholder="ex: Matematică, Fizică, Istorie..."
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Clasa
            <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={inputStyle}>
              {GRADE_LEVELS.map(g => (
                <option key={g} value={g}>a {g}-a</option>
              ))}
            </select>
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Tip
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              {NOTE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Capitol <span style={{ color: '#888', fontWeight: 400 }}>(opțional)</span>
          <input
            type="text"
            value={chapter}
            onChange={e => setChapter(e.target.value)}
            style={inputStyle}
          />
        </label>

        {/* Editor TipTap */}
        <label style={labelStyle}>
          Conținut <span style={{ color: '#888', fontWeight: 400 }}>(folosești editor cu suport KaTeX pentru formule)</span>
          <TipTapEditor editor={editor} />
        </label>

        {/* Fișier atașat */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Fișier atașat <span style={{ color: '#888', fontWeight: 400 }}>(opțional — imagini, PDF, Word, PowerPoint, Excel, max {MAX_FILE_MB} MB)</span>
          </span>

          {!file ? (
            <label style={dropZoneStyle}>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <span style={{ color: '#0066cc', cursor: 'pointer' }}>Alege fișier</span>
              <span style={{ color: '#999', marginLeft: 8 }}>sau trage aici</span>
            </label>
          ) : (
            <div style={filePreviewContainerStyle}>
              {filePreview ? (
                <img src={filePreview} alt="previzualizare" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 6, display: 'block', marginBottom: 8 }} />
              ) : (
                <div style={{ fontSize: 32, marginBottom: 4 }}>
                  {file.name.endsWith('.pdf') ? '📄' : '📎'}
                </div>
              )}
              <p style={{ margin: 0, fontSize: 14, color: '#333' }}>{file.name}</p>
              <p style={{ margin: '2px 0 8px', fontSize: 12, color: '#888' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button type="button" onClick={removeFile} style={btnRemoveStyle}>
                Elimină fișier
              </button>
            </div>
          )}
        </div>

        {error && <p style={{ color: 'red', marginBottom: 12 }}>❌ {error}</p>}

        <button type="submit" disabled={submitting} style={btnSubmitStyle}>
          {submitting ? 'Se publică...' : 'Publică notița'}
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: 16, fontWeight: 500 };
const inputStyle = {
  display: 'block',
  width: '100%',
  padding: 8,
  marginTop: 4,
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: 14,
  boxSizing: 'border-box',
};
const dropZoneStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '20px 16px',
  border: '2px dashed #ccc',
  borderRadius: 8,
  cursor: 'pointer',
};
const filePreviewContainerStyle = {
  padding: 16,
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  background: '#fafafa',
};
const btnRemoveStyle = {
  padding: '4px 10px',
  background: 'white',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  color: '#666',
};
const btnSubmitStyle = {
  padding: '10px 24px',
  background: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 15,
};
