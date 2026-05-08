import { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { RatingStars, RatingStarsDisplay } from '../components/RatingStars.jsx';
import { CommentsSection } from '../components/CommentsSection.jsx';
import { QuizModal } from '../components/QuizModal.jsx';
import { AIChatModal } from '../components/AIChatModal.jsx';

const BACKEND_URL = new URL(api.defaults.baseURL).origin;

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
function fileType(url) {
  const ext = url.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (ext === 'pdf')        return 'pdf';
  return 'document';
}

function FileAttachment({ fileUrl }) {
  const fullUrl = BACKEND_URL + fileUrl;
  const kind    = fileType(fileUrl);
  const name    = fileUrl.split('/').pop();

  if (kind === 'image') {
    return (
      <div style={{ marginBottom: 8 }}>
        <img
          src={fullUrl}
          alt="Atașament"
          style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }}
        />
        <a href={fullUrl} download={name} style={{ fontSize: 13, color: '#0066cc', marginTop: 6, display: 'inline-block' }}>
          Descarcă imaginea
        </a>
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div>
        <iframe
          src={fullUrl}
          title="PDF atașat"
          style={{ width: '100%', height: 600, border: '1px solid #e0e0e0', borderRadius: 8, display: 'block' }}
        />
        <a href={fullUrl} download={name} style={{ fontSize: 13, color: '#0066cc', marginTop: 8, display: 'inline-block' }}>
          Descarcă PDF
        </a>
      </div>
    );
  }

  const icon = name.match(/\.(docx?)$/i) ? '📝' : name.match(/\.(pptx?)$/i) ? '📊' : name.match(/\.(xlsx?)$/i) ? '📈' : '📎';
  return (
    <a href={fullUrl} download={name} style={docLinkStyle}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span>{name}</span>
    </a>
  );
}

// Randează conținut HTML din TipTap
function renderHTML(html) {
  return <div dangerouslySetInnerHTML={{ __html: html }} style={{ lineHeight: 1.8 }} />;
}

const REPORT_REASONS = [
  { value: 'PLAGIAT',             label: 'Plagiat' },
  { value: 'CONTINUT_NEPOTRIVIT', label: 'Conținut nepotrivit' },
  { value: 'SPAM',                label: 'Spam' },
  { value: 'ALTUL',               label: 'Altul' },
];

export default function NotePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [note, setNote]       = useState(null);
  const [error, setError]     = useState(null);
  const [comments, setComments] = useState([]);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  // Rating
  const [userRating, setUserRating]             = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Edit inline
  const [editing, setEditing]       = useState(false);
  const [editTitle, setEditTitle]   = useState('');
  const [editChapter, setEditChapter] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Report
  const [showReport, setShowReport]               = useState(false);
  const [reportReason, setReportReason]           = useState('PLAGIAT');
  const [reportDetails, setReportDetails]         = useState('');
  const [submittingReport, setSubmittingReport]   = useState(false);

  const isAuthor = user && note && user.id === note.authorId;

  useEffect(() => {
    api.get(`/notes/${id}`)
      .then(res => setNote(res.data))
      .catch(err => setError(err.response?.data?.error || err.message));
    api.get(`/notes/${id}/comments`)
      .then(res => setComments(res.data))
      .catch(() => {});
    // Obține ratingul utilizatorului dacă e logat
    if (user) {
      api.get(`/notes/${id}/rating`)
        .then(res => { if (res.data.value) setUserRating(res.data.value); })
        .catch(() => {});
    }
  }, [id, user]);

  if (error) return <p style={{ color: 'red' }}>❌ Eroare: {error}</p>;
  if (!note)  return <p>Se încarcă...</p>;

  async function handleRate(value) {
    if (!user || isAuthor || submittingRating) return;
    setSubmittingRating(true);
    try {
      await api.post(`/notes/${id}/ratings`, { value });
      setUserRating(value);
      // Reîncarcă nota pentru statistici actualizate
      const { data } = await api.get(`/notes/${id}`);
      setNote(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la vot');
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Sigur vrei să ștergi această notiță? Acțiunea este ireversibilă.')) return;
    try {
      await api.delete(`/notes/${id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la ștergere');
    }
  }

  function openEdit() {
    setEditTitle(note.title);
    setEditChapter(note.chapter || '');
    setEditing(true);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const { data } = await api.put(`/notes/${id}`, { title: editTitle, chapter: editChapter });
      setNote(prev => ({ ...prev, ...data }));
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la salvare');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleReportSubmit(e) {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const { data } = await api.post(`/notes/${id}/reports`, { reason: reportReason, details: reportDetails });
      setShowReport(false);
      setReportDetails('');

      const verdictMsg = data.aiVerdict === 'VALID'
        ? '\n\nAI a confirmat raportul. Notița a fost ascunsă temporar până la decizia finală a adminului.'
        : data.aiVerdict === 'INVALID'
        ? '\n\nAI consideră că raportul nu este justificat, dar va fi totuși revizuit de admin.'
        : '';

      alert('✅ Raportul a fost trimis. Mulțumim!' + verdictMsg);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la raportare');
    } finally {
      setSubmittingReport(false);
    }
  }

  return (
    <article>
      {/* Header: titlu sau formular de editare */}
      {editing ? (
        <form onSubmit={handleEditSave} style={{ marginBottom: 24 }}>
          <label style={labelStyle}>
            Titlu
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              required
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Capitol
            <input
              value={editChapter}
              onChange={e => setEditChapter(e.target.value)}
              placeholder="opțional"
              style={inputStyle}
            />
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={savingEdit} style={btnPrimary}>
              {savingEdit ? 'Se salvează...' : 'Salvează'}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={btnSecondary}>
              Anulează
            </button>
          </div>
        </form>
      ) : (
        <>
          <h1>{note.title}</h1>
          <p style={{ color: '#666' }}>
            {note.subject} • clasa a {note.gradeLevel}-a • {note.type}
            {note.chapter && <> • capitol: {note.chapter}</>}
          </p>
          <p>
            de{' '}
            <Link to={`/profile/${note.author.username}`} style={{ color: '#555' }}>
              <strong>{note.author.username}</strong>
            </Link>
          </p>
          {isAuthor && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <button onClick={openEdit} style={btnSecondary}>Editează</button>
              <button onClick={handleDelete} style={btnDanger}>Șterge</button>
            </div>
          )}
        </>
      )}

      {/* Fișier atașat */}
      {note.fileUrl && (
        <div style={{ marginTop: 24 }}>
          <FileAttachment fileUrl={note.fileUrl} />
        </div>
      )}

      {/* Conținut */}
      {note.content && (
        <div style={{ marginTop: 24 }}>
          {renderHTML(note.content)}
        </div>
      )}

      {!note.fileUrl && !note.content && (
        <p style={{ color: '#888', marginTop: 24 }}>Niciun conținut.</p>
      )}

      {/* Rating */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e0e0e0' }}>
        <h3 style={{ marginBottom: 12 }}>⭐ Evaluare</h3>
        {isAuthor ? (
          <p style={{ color: '#888', fontSize: 14 }}>Nu poți vota propria notiță.</p>
        ) : user ? (
          <RatingStars
            noteId={id}
            currentRating={userRating}
            onRate={handleRate}
          />
        ) : (
          <p style={{ color: '#888', fontSize: 14 }}>
            <Link to="/login">Autentifică-te</Link> pentru a vota.
          </p>
        )}
        <div style={{ marginTop: 12 }}>
          <RatingStarsDisplay rating={note.avgRating} count={note.ratingCount} />
        </div>
      </section>

      {/* Butoane AI */}
      <section style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => setQuizModalOpen(true)}
          style={{
            padding: '10px 16px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📝 Generează Quiz cu AI
        </button>
        <button
          onClick={() => setChatModalOpen(true)}
          style={{
            padding: '10px 16px',
            backgroundColor: '#7b1fa2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          💬 Cere ajutorul AI
        </button>
        <QuizModal noteId={id} isOpen={quizModalOpen} onClose={() => setQuizModalOpen(false)} />
        <AIChatModal
          noteId={id}
          noteTitle={note.title}
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
        />
      </section>

      {/* Raportează */}
      {user && !isAuthor && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowReport(true)}
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0 }}
          >
            ⚠️ Raportează notița
          </button>
        </div>
      )}

      {/* Modal raportare */}
      {showReport && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Raportează notița</h3>
            <form onSubmit={handleReportSubmit}>
              <label style={labelStyle}>
                Motiv
                <select value={reportReason} onChange={e => setReportReason(e.target.value)} style={inputStyle}>
                  {REPORT_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                Detalii <span style={{ color: '#888', fontWeight: 400 }}>(opțional)</span>
                <textarea
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={submittingReport} style={btnPrimary}>
                  {submittingReport ? 'Se trimite...' : 'Trimite raport'}
                </button>
                <button type="button" onClick={() => setShowReport(false)} style={btnSecondary}>
                  Anulează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comentarii cu threading */}
      <CommentsSection noteId={id} initialComments={comments} />
    </article>
  );
}

// Styles
const labelStyle = { display: 'block', marginBottom: 12, fontWeight: 500 };
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
const btnPrimary = {
  padding: '8px 16px',
  background: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
const btnSecondary = {
  padding: '8px 16px',
  background: 'white',
  color: '#333',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
};
const btnDanger = {
  padding: '8px 16px',
  background: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
const modalOverlay = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};
const modalBox = {
  background: 'white',
  padding: 24,
  borderRadius: 8,
  maxWidth: 480,
  width: '100%',
  margin: '0 16px',
};
const docLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 16px',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  textDecoration: 'none',
  color: '#333',
  background: '#fafafa',
  fontSize: 14,
};
