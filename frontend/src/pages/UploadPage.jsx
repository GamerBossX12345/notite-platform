import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../api/client.js';
import { useEditorSetup, TipTapEditor } from '../components/TipTapEditor.jsx';
import { TagInput } from '../components/TagInput.jsx';

const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5); // 5..12
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const romanOf = (n) => ROMAN[n - 1] || String(n);

// Materii disponibile pe clasă — pentru gimnaziu (5-8) sunt mai puține,
// iar pentru liceu (9-12) se adaugă Filosofie / Economie / Psihologie.
const SUBJECTS_BY_GRADE = {
  5:  ['Matematică', 'Biologie', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Informatică'],
  6:  ['Matematică', 'Fizică', 'Biologie', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Informatică'],
  7:  ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Informatică'],
  8:  ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Informatică'],
  9:  ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză'],
  10: ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Psihologie'],
  11: ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Filosofie', 'Economie', 'Psihologie'],
  12: ['Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică', 'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză', 'Filosofie', 'Economie'],
};

// Capitole predefinite per (clasă, materie). Sunt acoperite combinațiile mai
// frecvente; pentru restul, userul folosește opțiunea „Altul…" care deschide
// un input text liber.
const CHAPTERS = {
  '5|Matematică': ['Numere naturale', 'Divizibilitate', 'Fracții ordinare', 'Fracții zecimale', 'Elemente de geometrie', 'Unități de măsură'],
  '6|Matematică': ['Mulțimea numerelor naturale', 'Divizibilitate', 'Numere raționale pozitive', 'Rapoarte și proporții', 'Drepte și unghiuri', 'Triunghiul'],
  '7|Matematică': ['Mulțimea numerelor raționale', 'Mulțimea numerelor reale', 'Calcul algebric', 'Ecuații și inecuații', 'Patrulater', 'Asemănarea triunghiurilor', 'Relații metrice'],
  '8|Matematică': ['Calcul algebric', 'Funcții', 'Ecuații și sisteme', 'Cerc', 'Arii și volume', 'Corpuri geometrice'],
  '9|Matematică': ['Mulțimi de numere', 'Funcția de gradul I', 'Funcția de gradul al II-lea', 'Vectori în plan', 'Trigonometrie', 'Geometrie analitică'],
  '10|Matematică': ['Mulțimi de numere (R, C)', 'Funcții și ecuații', 'Combinatorică', 'Geometrie analitică', 'Trigonometrie aplicată'],
  '11|Matematică': ['Permutări, aranjamente, combinări', 'Matrice', 'Determinanți', 'Sisteme liniare', 'Limite de funcții', 'Continuitate', 'Derivabilitate'],
  '12|Matematică': ['Grupuri, inele, corpuri', 'Polinoame', 'Primitive', 'Integrale definite', 'Aplicații ale integralelor'],

  '6|Fizică':  ['Mărimi și unități', 'Optica', 'Fenomene termice'],
  '7|Fizică':  ['Mecanica', 'Fenomene electrice', 'Optica'],
  '8|Fizică':  ['Lucrul mecanic și energia', 'Electricitate', 'Optica geometrică'],
  '9|Fizică':  ['Mecanică', 'Statică', 'Termodinamică'],
  '10|Fizică': ['Mecanica fluidelor', 'Termodinamică', 'Electrostatică'],
  '11|Fizică': ['Curent continuu', 'Curent alternativ', 'Câmp magnetic', 'Oscilații și unde'],
  '12|Fizică': ['Electromagnetism', 'Optica ondulatorie', 'Fizică atomică', 'Fizică nucleară'],

  '7|Chimie':  ['Substanțe pure', 'Atomul', 'Soluții'],
  '8|Chimie':  ['Reacții chimice', 'Acizi și baze', 'Săruri'],
  '9|Chimie':  ['Structura atomului', 'Tabelul periodic', 'Legături chimice'],
  '10|Chimie': ['Chimie organică — hidrocarburi', 'Compuși hidroxilici', 'Compuși carbonilici'],
  '11|Chimie': ['Chimie organică avansată', 'Aminoacizi și proteine', 'Glucide'],
  '12|Chimie': ['Termodinamică chimică', 'Cinetică chimică', 'Electrochimie'],

  '9|Biologie':  ['Celula', 'Țesuturi', 'Organe și sisteme'],
  '10|Biologie': ['Anatomia și fiziologia omului', 'Sistemul digestiv', 'Sistemul circulator'],
  '11|Biologie': ['Genetică', 'Ecologie', 'Evoluție'],
  '12|Biologie': ['Genetică moleculară', 'Biotehnologii', 'Genetică umană'],

  '9|Informatică':  ['Algoritmi — noțiuni introductive', 'Limbajul C/C++ — bazele', 'Structuri de date elementare'],
  '10|Informatică': ['Subprograme', 'Tablouri', 'Șiruri de caractere', 'Algoritmi de sortare'],
  '11|Informatică': ['Structuri de date', 'Backtracking', 'Recursivitate', 'Programare dinamică'],
  '12|Informatică': ['Grafuri neorientate', 'Grafuri orientate', 'Arbori', 'Baze de date'],

  '9|Istorie':  ['Antichitate', 'Evul Mediu'],
  '10|Istorie': ['Epoca modernă'],
  '11|Istorie': ['Secolul XX'],
  '12|Istorie': ['România contemporană', 'Lumea postbelică'],

  '9|Geografie':  ['Geografie fizică generală'],
  '10|Geografie': ['Geografie umană', 'Geografie economică'],
  '11|Geografie': ['Europa', 'Uniunea Europeană'],
  '12|Geografie': ['România — geografie', 'Probleme globale'],

  '9|Română':  ['Literatura veche și premodernă', 'Curente literare'],
  '10|Română': ['Pașoptismul', 'Junimea', 'Marii clasici'],
  '11|Română': ['Modernism', 'Tradiționalism', 'Avangardă'],
  '12|Română': ['Postmodernism', 'Romanul interbelic', 'Poezia interbelică'],

  '11|Filosofie': ['Filosofia politică', 'Etică', 'Filosofia cunoașterii'],
  '12|Filosofie': ['Existența', 'Persoana', 'Filosofia religiei'],

  '11|Economie': ['Cerere și ofertă', 'Piața', 'Producția'],
  '12|Economie': ['Piața muncii', 'Inflația', 'Comerțul internațional'],

  '10|Psihologie': ['Procese cognitive', 'Procese afective'],
  '11|Psihologie': ['Personalitatea', 'Conduita socială'],
};

const CHAPTER_OTHER = '__OTHER__';
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
  const { t } = useTranslation();
  const NOTE_TYPES = [
    { value: 'REZUMAT',           label: t('upload.noteTypeRezumat')   },
    { value: 'EXERCITII',         label: t('upload.noteTypeExercitii') },
    { value: 'FISA',              label: t('upload.noteTypeFisa')      },
    { value: 'HARTA_CONCEPTUALA', label: t('upload.noteTypeHarta')     },
    { value: 'FORMULE',           label: t('upload.noteTypeFormule')   },
  ];

  const [title, setTitle]           = useState('');
  const [subject, setSubject]       = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [chapter, setChapter]       = useState('');     // valoarea finală trimisă
  const [chapterChoice, setChapterChoice] = useState(''); // dropdown ('' | nume | __OTHER__)
  const [chapterCustom, setChapterCustom] = useState(''); // text liber când e __OTHER__
  const [type, setType]             = useState('');
  const [tags, setTags]             = useState([]);
  const [file, setFile]             = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError]           = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasDraft, setHasDraft]     = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Materii și capitole dependente
  const availableSubjects = useMemo(() => {
    if (!gradeLevel) return [];
    return SUBJECTS_BY_GRADE[Number(gradeLevel)] || [];
  }, [gradeLevel]);

  const availableChapters = useMemo(() => {
    if (!gradeLevel || !subject) return [];
    return CHAPTERS[`${gradeLevel}|${subject}`] || [];
  }, [gradeLevel, subject]);

  // Când se schimbă clasa, dacă materia curentă nu mai e validă, o resetăm.
  useEffect(() => {
    if (subject && availableSubjects.length > 0 && !availableSubjects.includes(subject)) {
      setSubject('');
    }
  }, [availableSubjects, subject]);

  // Când se schimbă clasa sau materia, resetăm capitolul.
  useEffect(() => {
    setChapterChoice('');
    setChapterCustom('');
    setChapter('');
  }, [gradeLevel, subject]);

  // Sincronizăm `chapter` cu alegerea dropdown / text custom.
  useEffect(() => {
    if (chapterChoice === CHAPTER_OTHER) setChapter(chapterCustom.trim());
    else setChapter(chapterChoice);
  }, [chapterChoice, chapterCustom]);

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
      setGradeLevel(d.gradeLevel || '');
      setSubject(d.subject || '');
      setType(d.type || '');
      if (d.chapter) {
        const known = (CHAPTERS[`${d.gradeLevel}|${d.subject}`] || []).includes(d.chapter);
        if (known) {
          setChapterChoice(d.chapter);
        } else {
          setChapterChoice(CHAPTER_OTHER);
          setChapterCustom(d.chapter);
        }
      }
      if (d.content && editor) editor.commands.setContent(d.content);
      setHasDraft(false);
      setDraftRestored(true);
    } catch { /* ignore */ }
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY(user.id));
    setHasDraft(false);
  }

  function saveDraft() {
    if (!user || !editor) return;
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
  }, [user, title, subject, gradeLevel, chapter, type]); // eslint-disable-line

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      clearTimeout(onUpdate._t);
      onUpdate._t = setTimeout(saveDraft, 600);
    };
    editor.on('update', onUpdate);
    return () => { editor.off('update', onUpdate); clearTimeout(onUpdate._t); };
  }, [editor, user, title, subject, gradeLevel, chapter, type]); // eslint-disable-line

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

    if (!chapter || !chapter.trim()) {
      setError('Selectează sau introdu un capitol.');
      return;
    }
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
      // Tipul e marcat opțional în UI, dar schema cere o valoare — fallback rezumat.
      formData.append('type', type || 'REZUMAT');
      if (hasContent) formData.append('content', JSON.stringify(editor.getJSON()));
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));
      if (file) formData.append('file', file);

      const { data } = await api.post('/notes', formData);
      if (user) localStorage.removeItem(DRAFT_KEY(user.id));
      // Navigare directă, fără popup de delay.
      navigate(`/notes/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || t('common.saveError'));
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>📝 {t('upload.title')}</h1>

      {hasDraft && (
        <div style={draftBannerStyle(darkMode)}>
          <div style={{ flex: 1 }}>
            <strong>💾 {t('upload.draftRestored')}</strong>
          </div>
          <button type="button" onClick={restoreDraft} style={btnRestoreDraft}>{t('common.confirm')}</button>
          <button type="button" onClick={discardDraft} style={btnDiscardDraft(darkMode)}>{t('upload.draftDiscard')}</button>
        </div>
      )}

      <form onSubmit={openConfirm}>
        <div style={{ marginBottom: 16, width: '50%', minWidth: 280 }}>
          <FieldLabel darkMode={darkMode}>{t('upload.titleField')}</FieldLabel>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)} required
            style={inputStyle(darkMode)}
          />
        </div>

        <div style={threeColGrid}>
          <div>
            <FieldLabel darkMode={darkMode}>{t('upload.gradeField')}</FieldLabel>
            <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} required style={inputStyle(darkMode)}>
              <option value="" disabled>—</option>
              {GRADE_LEVELS.map(g => (
                <option key={g} value={g}>{romanOf(g)}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('upload.tagsField')}</FieldLabel>
            <TagInput value={tags} onChange={setTags} max={8} />
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('upload.typeField')}</FieldLabel>
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle(darkMode)}>
              <option value="">—</option>
              {NOTE_TYPES.map(nt => <option key={nt.value} value={nt.value}>{nt.label}</option>)}
            </select>
          </div>
        </div>

        <div style={twoColGrid}>
          <div>
            <FieldLabel darkMode={darkMode}>{t('upload.subjectField')}</FieldLabel>
            <select
              value={subject} onChange={e => setSubject(e.target.value)}
              required disabled={!gradeLevel}
              style={inputStyle(darkMode, !gradeLevel)}
            >
              <option value="" disabled>—</option>
              {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel darkMode={darkMode}>{t('upload.chapterField')}</FieldLabel>
            <select
              value={chapterChoice}
              onChange={e => setChapterChoice(e.target.value)}
              required disabled={!subject}
              style={inputStyle(darkMode, !subject)}
            >
              <option value="" disabled>{t('upload.chapterPlaceholder')}</option>
              {availableChapters.map(c => <option key={c} value={c}>{c}</option>)}
              <option value={CHAPTER_OTHER}>—</option>
            </select>
            {chapterChoice === CHAPTER_OTHER && (
              <input
                type="text" value={chapterCustom}
                onChange={e => setChapterCustom(e.target.value)}
                placeholder={t('upload.chapterField')}
                required
                style={{ ...inputStyle(darkMode), marginTop: 8 }}
              />
            )}
          </div>
        </div>

        <div style={comboBoxStyle(darkMode)}>
          <div style={{ padding: 14, borderBottom: darkMode ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid rgba(0,0,0,0.08)' }}>
            <FieldLabel darkMode={darkMode} compact>{t('upload.contentField')}</FieldLabel>
            <TipTapEditor editor={editor} />
          </div>
          <div style={{ padding: 14 }}>
            <FieldLabel darkMode={darkMode} compact hint={t('upload.fileHint')}>{t('upload.fileField')}</FieldLabel>
            {!file ? (
              <label style={dropZoneStyle(darkMode)}>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES}
                  onChange={handleFileChange} style={{ display: 'none' }} />
                <span style={{ color: darkMode ? '#c9a8ff' : '#0066cc', cursor: 'pointer', fontWeight: 600 }}>
                  {t('common.open')}
                </span>
              </label>
            ) : file.type === 'application/pdf' ? (
              <PdfPreviewCard file={file} onRemove={removeFile} darkMode={darkMode} />
            ) : (
              <div style={filePreviewContainerStyle(darkMode)}>
                {filePreview ? (
                  <img src={filePreview} alt=""
                    style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 6, display: 'block', marginBottom: 8 }} />
                ) : (
                  <div style={{ fontSize: 32, marginBottom: 4 }}>📎</div>
                )}
                <p style={{ margin: 0, fontSize: 14, color: darkMode ? '#e8e0ff' : '#333' }}>{file.name}</p>
                <p style={{ margin: '2px 0 8px', fontSize: 12, color: darkMode ? '#a89bc4' : '#888' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button type="button" onClick={removeFile} style={btnRemoveStyle(darkMode)}>{t('upload.removeFile')}</button>
              </div>
            )}
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', marginBottom: 12 }}>❌ {error}</p>}

        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginTop: 24 }}>
          {confirmOpen && (
            <div style={confirmPopoverStyle(darkMode)}>
              <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>
                {t('upload.submit')}?
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setConfirmOpen(false)} style={confirmCancelBtn(darkMode)}>
                  {t('common.cancel')}
                </button>
                <button type="button" onClick={doSubmit} style={confirmOkBtn}>
                  {t('common.confirm')}
                </button>
              </div>
              <div style={confirmArrowStyle(darkMode)} />
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || confirmOpen}
            className="publish-btn"
          >
            {submitting ? t('upload.submitting') : t('upload.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldLabel({ children, hint, darkMode, compact }) {
  return (
    <div style={{
      display: 'block', fontWeight: 500, fontSize: 14,
      marginBottom: compact ? 6 : 6,
      color: darkMode ? '#d4c8ff' : '#1a1a1a',
    }}>
      {children}
      {hint && (
        <span style={{ color: darkMode ? '#a89bc4' : '#888', fontWeight: 400, marginLeft: 6 }}>
          ({hint})
        </span>
      )}
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

// ── Stiluri ──────────────────────────────────────────────────────────────────
const threeColGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 12,
  marginBottom: 16,
};
const twoColGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginBottom: 16,
};
const inputStyle = (darkMode, disabled) => ({
  display: 'block', width: '100%', padding: 8,
  background: darkMode ? 'transparent' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
  opacity: disabled ? 0.55 : 1,
  cursor: disabled ? 'not-allowed' : 'auto',
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease, opacity 0.2s ease',
});
const comboBoxStyle = (darkMode) => ({
  marginBottom: 16,
  borderRadius: 12,
  overflow: 'hidden',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(0, 0, 0, 0.1)',
  background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.6)',
  boxShadow: darkMode
    ? '0 4px 16px rgba(80, 20, 160, 0.18)'
    : '0 4px 16px rgba(0, 0, 0, 0.04)',
});
const dropZoneStyle = (darkMode) => ({
  display: 'flex', alignItems: 'center', padding: '20px 16px',
  border: darkMode ? '2px dashed rgba(168, 85, 247, 0.4)' : '2px dashed #ccc',
  borderRadius: 8, cursor: 'pointer',
});
const filePreviewContainerStyle = (darkMode) => ({
  padding: 16, borderRadius: 8,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #e0e0e0',
  background: darkMode ? 'rgba(0,0,0,0.2)' : '#fafafa',
});
const btnRemoveStyle = (darkMode) => ({
  padding: '4px 10px',
  background: darkMode ? 'rgba(0,0,0,0.3)' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #ccc',
  borderRadius: 4, cursor: 'pointer', fontSize: 13,
  color: darkMode ? '#c9a8ff' : '#666',
});
const confirmPopoverStyle = (darkMode) => ({
  position: 'absolute',
  bottom: 'calc(100% + 12px)',
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
  left: '50%',
  marginLeft: -6,
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
