import { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const BACKEND_URL = new URL(api.defaults.baseURL).origin; // 'http://localhost:3000'

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

// Randează conținut TipTap JSON (format ProseMirror) în React
function renderNode(node, key) {
  if (!node) return null;
  const children = node.content?.map((child, i) => renderNode(child, i));

  switch (node.type) {
    case 'doc':
      return <Fragment key={key}>{children}</Fragment>;
    case 'paragraph':
      return <p key={key} style={{ margin: '0 0 12px' }}>{children ?? <br />}</p>;
    case 'text': {
      let el = node.text;
      node.marks?.forEach(mark => {
        if (mark.type === 'bold')      el = <strong key={key}>{el}</strong>;
        if (mark.type === 'italic')    el = <em key={key}>{el}</em>;
        if (mark.type === 'underline') el = <u key={key}>{el}</u>;
        if (mark.type === 'code')      el = <code key={key} style={inlineCodeStyle}>{el}</code>;
      });
      return <Fragment key={key}>{el}</Fragment>;
    }
    case 'heading': {
      const Tag = `h${node.attrs?.level ?? 1}`;
      return <Tag key={key}>{children}</Tag>;
    }
    case 'bulletList':     return <ul key={key}>{children}</ul>;
    case 'orderedList':    return <ol key={key}>{children}</ol>;
    case 'listItem':       return <li key={key}>{children}</li>;
    case 'hardBreak':      return <br key={key} />;
    case 'horizontalRule': return <hr key={key} />;
    case 'blockquote':
      return <blockquote key={key} style={blockquoteStyle}>{children}</blockquote>;
    case 'codeBlock':
      return <pre key={key} style={codeBlockStyle}><code>{children}</code></pre>;
    default:
      return null;
  }
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

  // Rating
  const [ratingHover, setRatingHover]           = useState(0);
  const [userRating, setUserRating]             = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Comments
  const [commentText, setCommentText]               = useState('');
  const [submittingComment, setSubmittingComment]   = useState(false);

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
  }, [id]);

  if (error) return <p style={{ color: 'red' }}>Eroare: {error}</p>;
  if (!note)  return <p>Se încarcă...</p>;

  // --- Rating ---
  async function handleRate(value) {
    if (!user || isAuthor || submittingRating) return;
    setSubmittingRating(true);
    try {
      const { data } = await api.post(`/notes/${id}/ratings`, { value });
      setNote(prev => ({ ...prev, avgRating: data.avgRating, ratingCount: data.ratingCount }));
      setUserRating(value);
    } catch {
      // ignoră erori (ex: vot propriu, neautentificat)
    } finally {
      setSubmittingRating(false);
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!confirm('Sigur vrei să ștergi această notiță? Acțiunea este ireversibilă.')) return;
    try {
      await api.delete(`/notes/${id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la ștergere');
    }
  }

  // --- Edit ---
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

  // --- Comments ---
  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const { data } = await api.post(`/notes/${id}/comments`, { content: commentText.trim() });
      setComments(prev => [...prev, data]);
      setCommentText('');
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la comentariu');
    } finally {
      setSubmittingComment(false);
    }
  }

  // --- Report ---
  async function handleReportSubmit(e) {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await api.post(`/notes/${id}/reports`, { reason: reportReason, details: reportDetails });
      setShowReport(false);
      setReportDetails('');
      alert('Raportul a fost trimis. Mulțumim!');
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

      {/* Conținut text */}
      {note.content && (
        <div style={{ marginTop: 24, lineHeight: 1.8 }}>
          {renderNode(note.content, 'root')}
        </div>
      )}

      {!note.fileUrl && !note.content && (
        <p style={{ color: '#888', marginTop: 24 }}>Niciun conținut.</p>
      )}

      {/* Rating */}
      <section style={{ marginTop: 40 }}>
        <h3 style={{ marginBottom: 8 }}>Evaluare</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <span
              key={star}
              style={{
                fontSize: 30,
                cursor: user && !isAuthor ? 'pointer' : 'default',
                opacity: submittingRating ? 0.5 : 1,
                lineHeight: 1,
              }}
              onMouseEnter={() => user && !isAuthor && setRatingHover(star)}
              onMouseLeave={() => setRatingHover(0)}
              onClick={() => handleRate(star)}
            >
              {star <= (ratingHover || userRating || Math.round(note.avgRating)) ? '★' : '☆'}
            </span>
          ))}
          {note.ratingCount > 0 && (
            <span style={{ color: '#666', fontSize: 14, marginLeft: 4 }}>
              {note.avgRating.toFixed(1)} ({note.ratingCount} {note.ratingCount === 1 ? 'vot' : 'voturi'})
            </span>
          )}
        </div>
        {!user && (
          <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
            <Link to="/login">Autentifică-te</Link> pentru a vota.
          </p>
        )}
        {isAuthor && (
          <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Nu poți vota propria notiță.</p>
        )}
        {userRating > 0 && (
          <p style={{ fontSize: 13, color: '#0066cc', marginTop: 6 }}>Ai votat cu {userRating} stele.</p>
        )}
      </section>

      {/* Raportează */}
      {user && !isAuthor && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowReport(true)}
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0 }}
          >
            Raportează notița
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

      {/* Comentarii */}
      <section style={{ marginTop: 40 }}>
        <h3>Comentarii ({comments.length})</h3>
        {comments.length === 0 ? (
          <p style={{ color: '#888' }}>Niciun comentariu încă.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {comments.map(comment => (
              <li key={comment.id} style={commentItemStyle}>
                <p style={{ margin: 0, fontSize: 13 }}>
                  <Link to={`/profile/${comment.user.username}`} style={{ fontWeight: 600, color: '#333' }}>
                    {comment.user.username}
                  </Link>
                  <span style={{ color: '#bbb', marginLeft: 8 }}>
                    {new Date(comment.createdAt).toLocaleDateString('ro-RO')}
                  </span>
                </p>
                <p style={{ margin: '6px 0 0' }}>{comment.content}</p>
                {comment.replies?.map(reply => (
                  <div key={reply.id} style={replyStyle}>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      <Link to={`/profile/${reply.user.username}`} style={{ fontWeight: 600, color: '#333' }}>
                        {reply.user.username}
                      </Link>
                    </p>
                    <p style={{ margin: '4px 0 0' }}>{reply.content}</p>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}

        {user ? (
          <form onSubmit={handleCommentSubmit} style={{ marginTop: 16 }}>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Adaugă un comentariu..."
              rows={3}
              required
              style={{ ...inputStyle, display: 'block', resize: 'vertical' }}
            />
            <button type="submit" disabled={submittingComment} style={{ ...btnPrimary, marginTop: 8 }}>
              {submittingComment ? 'Se trimite...' : 'Comentează'}
            </button>
          </form>
        ) : (
          <p style={{ color: '#888', fontSize: 14, marginTop: 12 }}>
            <Link to="/login">Autentifică-te</Link> pentru a comenta.
          </p>
        )}
      </section>
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
const commentItemStyle = {
  padding: '12px 0',
  borderBottom: '1px solid #f0f0f0',
};
const replyStyle = {
  marginTop: 8,
  marginLeft: 20,
  padding: '8px 12px',
  background: '#f9f9f9',
  borderRadius: 6,
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
const inlineCodeStyle = {
  background: '#f0f0f0',
  padding: '1px 4px',
  borderRadius: 3,
  fontFamily: 'monospace',
};
const blockquoteStyle = {
  borderLeft: '3px solid #ccc',
  margin: '0 0 12px',
  paddingLeft: 16,
  color: '#555',
};
const codeBlockStyle = {
  background: '#f5f5f5',
  padding: 12,
  borderRadius: 6,
  overflow: 'auto',
  marginBottom: 12,
};
