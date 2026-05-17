import { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { RatingStars, RatingStarsDisplay } from '../components/RatingStars.jsx';
import { CommentsSection } from '../components/CommentsSection.jsx';
import { QuizModal } from '../components/QuizModal.jsx';
import { AIChatModal } from '../components/AIChatModal.jsx';
import { TipTapRenderer } from '../components/TipTapEditor.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import { useRecentNotes } from '../hooks/useRecentNotes.js';
import { NoteEditForm } from '../components/NoteEditForm.jsx';
import { TeacherBadge, AuthorBadge } from '../components/Badges.jsx';
import { TeacherValidationPanel } from '../components/TeacherValidationPanel.jsx';

const BACKEND_URL = new URL(api.defaults.baseURL).origin;

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
function fileType(url) {
  const ext = url.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (ext === 'pdf')        return 'pdf';
  return 'document';
}

function FileAttachment({ fileUrl }) {
  const { darkMode } = useAuth();
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
    const cardStyle = {
      borderRadius: 14,
      overflow: 'hidden',
      border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(0, 0, 0, 0.08)',
      background: darkMode ? 'rgba(20, 8, 50, 0.6)' : '#ffffff',
      boxShadow: darkMode
        ? '0 8px 32px rgba(80, 20, 160, 0.35), 0 2px 8px rgba(0,0,0,0.3)'
        : '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0,0,0,0.04)',
      backdropFilter: 'blur(10px)',
    };
    const footerStyle = {
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
      padding: '10px 14px',
      borderTop: darkMode ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(0, 0, 0, 0.06)',
      background: darkMode
        ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(59, 130, 246, 0.12) 100%)'
        : 'linear-gradient(135deg, rgba(244, 114, 182, 0.08) 0%, rgba(34, 211, 238, 0.08) 100%)',
      color: darkMode ? '#e8e0ff' : '#1a1a1a',
    };
    const pillBtn = {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 11px', borderRadius: 999,
      fontSize: 12, fontWeight: 600, textDecoration: 'none',
      border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(0, 0, 0, 0.1)',
      background: darkMode ? 'rgba(80, 20, 160, 0.35)' : 'rgba(255, 255, 255, 0.8)',
      color: darkMode ? '#e8e0ff' : '#374151',
    };
    return (
      <div style={cardStyle}>
        <iframe
          src={`${fullUrl}#view=FitH&toolbar=1`}
          title="PDF atașat"
          style={{ width: '100%', height: 720, border: 'none', display: 'block', background: darkMode ? '#1a0b2e' : '#f5f5f5' }}
        />
        <div style={footerStyle}>
          <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={pillBtn} title="Deschide în filă nouă">
            ↗ Deschide
          </a>
          <a href={fullUrl} download={name} style={pillBtn} title="Descarcă PDF">
            ⬇ Descarcă
          </a>
        </div>
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


const REPORT_REASONS = [
  { value: 'PLAGIAT',             label: 'Plagiat' },
  { value: 'CONTINUT_NEPOTRIVIT', label: 'Conținut nepotrivit' },
  { value: 'SPAM',                label: 'Spam' },
  { value: 'ALTUL',               label: 'Altul' },
];

export default function NotePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, darkMode } = useAuth();

  const [note, setNote]       = useState(null);
  const [error, setError]     = useState(null);
  const [comments, setComments] = useState([]);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  // Flashcards — generare AI
  const [flashGenStatus, setFlashGenStatus] = useState('idle'); // idle | loading | done | error
  const [flashGenMsg, setFlashGenMsg]       = useState('');

  // Rating
  const [userRating, setUserRating]             = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Edit — folosim NoteEditForm care suportă editarea completă (inclusiv conținut).
  const [editing, setEditing] = useState(false);

  // Report
  const [showReport, setShowReport]               = useState(false);
  const [reportReason, setReportReason]           = useState('PLAGIAT');
  const [reportDetails, setReportDetails]         = useState('');
  const [submittingReport, setSubmittingReport]   = useState(false);

  // Appeal împotriva ștergerii programate
  const [appealMsg, setAppealMsg]                 = useState('');
  const [appealOpen, setAppealOpen]               = useState(false);
  const [submittingAppeal, setSubmittingAppeal]   = useState(false);

  const isAuthor = user && note && user.id === note.authorId;
  const isAdmin  = user?.role === 'ADMIN' || user?.role === 'HEAD_ADMIN';
  const isTeacher = !!user?.isTeacher;
  // Autor + admin + profesor verificat pot edita conținutul notei.
  const canEdit   = isAuthor || isAdmin || isTeacher;
  // Doar autorul + admin pot șterge.
  const canDelete = isAuthor || isAdmin;

  const { trackVisit } = useRecentNotes();

  useEffect(() => {
    api.get(`/notes/${id}`)
      .then(res => {
        setNote(res.data);
        trackVisit(res.data);
      })
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
  }, [id, user, trackVisit]);

  if (error) return <p style={{ color: 'red' }}>❌ Eroare: {error}</p>;
  if (!note)  return <p>Se încarcă...</p>;

  async function handleGenerateFlashcards() {
    if (flashGenStatus === 'loading') return;
    setFlashGenStatus('loading');
    setFlashGenMsg('');
    try {
      const { data } = await api.post(`/notes/${id}/flashcards/generate`);
      setFlashGenStatus('done');
      setFlashGenMsg(`${data.count} flashcards generate și adăugate în colecția ta.`);
    } catch (err) {
      setFlashGenStatus('error');
      setFlashGenMsg(err.response?.data?.error || 'Eroare la generarea flashcards.');
    }
  }

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
      const url = isAuthor ? `/notes/${id}` : `/admin/notes/${id}`;
      await api.delete(url);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la ștergere');
    }
  }

  function handleNoteSaved(updated) {
    setNote(prev => ({ ...prev, ...updated }));
    setEditing(false);
  }

  async function submitNoteAppeal(e) {
    e.preventDefault();
    setSubmittingAppeal(true);
    try {
      await api.post(`/auth/notes/${id}/appeal`, { message: appealMsg });
      // refetch nota pentru a actualiza appeal-ul afișat
      const { data } = await api.get(`/notes/${id}`);
      setNote(data);
      setAppealOpen(false);
      setAppealMsg('');
      alert('Apelul tău a fost depus. Notița nu va fi ștearsă cât timp tichetul e activ.');
    } catch (err) {
      alert(err.response?.data?.error || 'Nu am putut depune apelul.');
    } finally {
      setSubmittingAppeal(false);
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
    <article className="printable">
      <div className="no-print">
        <Leaderboard featuredAuthor={note.author} />
      </div>
      {/* Header: titlu sau formular de editare (titlu + conținut + fișier + meta) */}
      {editing ? (
        <NoteEditForm
          note={note}
          onSaved={handleNoteSaved}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <h1>{note.title}</h1>
          <p style={{ color: '#666' }}>
            {note.subject} • clasa a {note.gradeLevel}-a • {note.type}
            {note.chapter && <> • capitol: {note.chapter}</>}
            {note.author && (
              <>
                {' '}• de{' '}
                <Link to={`/users/${note.author.username}`} style={{ color: 'inherit' }}>
                  {note.author.username}
                </Link>
                {note.author.isTeacher && <TeacherBadge />}
              </>
            )}
          </p>

          {/* Banner ștergere programată — vizibil pentru autor și admini */}
          {note.deletionScheduledAt && (isAuthor || isAdmin) && (
            <div style={deletionBannerStyle(darkMode)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 32 }}>⚠️</span>
                <div>
                  <strong style={{ fontSize: 16 }}>Notiță programată pentru ștergere</strong>
                  <div style={{ fontSize: 13, color: darkMode ? '#fcd34d' : '#92400e', marginTop: 2 }}>
                    Va fi ștearsă efectiv la {new Date(note.deletionScheduledAt).toLocaleString('ro-RO')}.
                  </div>
                </div>
              </div>
              {note.deletionReason && (
                <p style={{ margin: '8px 0', padding: 10, borderRadius: 6, background: darkMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)' }}>
                  <strong>Motiv:</strong> {note.deletionReason}
                </p>
              )}
              {note.appeals && note.appeals.length > 0 ? (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: darkMode ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.06)' }}>
                  <strong>Apel depus</strong> — status: {note.appeals[0].status}
                  {note.appeals[0].status !== 'RESOLVED' && (
                    <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                      Cât timp acest tichet e activ, notița NU va fi ștearsă.
                    </p>
                  )}
                  {note.appeals[0].adminResponse && (
                    <p style={{ margin: '6px 0 0', fontSize: 13, fontStyle: 'italic' }}>
                      Răspuns admin: {note.appeals[0].adminResponse}
                    </p>
                  )}
                </div>
              ) : isAuthor && (
                appealOpen ? (
                  <form onSubmit={submitNoteAppeal} style={{ marginTop: 10 }}>
                    <textarea
                      value={appealMsg}
                      onChange={e => setAppealMsg(e.target.value)}
                      rows={4} minLength={20} maxLength={5000} required
                      placeholder="Explică de ce notița n-ar trebui ștearsă (min 20 caractere)..."
                      style={appealTextarea(darkMode)}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="submit" disabled={submittingAppeal || appealMsg.trim().length < 20} style={btnPrimary(darkMode)}>
                        {submittingAppeal ? 'Se trimite...' : 'Depune apel'}
                      </button>
                      <button type="button" onClick={() => setAppealOpen(false)} style={btnSecondary(darkMode)}>
                        Anulează
                      </button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setAppealOpen(true)} style={{ ...btnPrimary(darkMode), marginTop: 8 }}>
                    📩 Depune apel pentru a salva notița
                  </button>
                )
              )}
            </div>
          )}
          <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {canEdit && (
              <button onClick={() => setEditing(true)} style={btnSecondary(darkMode)}>
                {isAuthor ? 'Editează' : 'Editează (profesor)'}
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete} style={btnDanger}>Șterge</button>
            )}
            <button
              onClick={() => window.print()}
              style={btnSecondary(darkMode)}
              title="Printează sau salvează ca PDF"
            >
              🖨️ Printează / PDF
            </button>
          </div>
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
          <TipTapRenderer content={note.content} />
        </div>
      )}

      {!note.fileUrl && !note.content && (
        <p style={{ color: '#888', marginTop: 24 }}>Niciun conținut.</p>
      )}

      {/* Rating */}
      <section className="no-print" style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e0e0e0' }}>
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

      {/* Butoane AI — disponibile doar pentru useri logați. Limită server-side:
          3 quizuri și 5 replici de chat pe oră / user. */}
      <section className="no-print" style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {user ? (
          <>
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
            <button
              onClick={handleGenerateFlashcards}
              disabled={flashGenStatus === 'loading'}
              style={{
                padding: '10px 16px',
                backgroundColor: flashGenStatus === 'loading' ? '#888' : '#0277bd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: flashGenStatus === 'loading' ? 'wait' : 'pointer',
                fontSize: '14px',
              }}
            >
              {flashGenStatus === 'loading' ? '⏳ Se generează...' : '🎴 Generează flashcards'}
            </button>
            <QuizModal noteId={id} isOpen={quizModalOpen} onClose={() => setQuizModalOpen(false)} />
            <AIChatModal
              noteId={id}
              noteTitle={note.title}
              isOpen={chatModalOpen}
              onClose={() => setChatModalOpen(false)}
            />
            {flashGenMsg && (
              <div style={{
                flexBasis: '100%',
                marginTop: 4,
                fontSize: 13,
                color: flashGenStatus === 'error'
                  ? (darkMode ? '#ff9999' : '#b91c1c')
                  : (darkMode ? '#86efac' : '#16a34a'),
              }}>
                {flashGenStatus === 'error' ? '❌ ' : '✅ '}{flashGenMsg}
                {flashGenStatus === 'done' && (
                  <> <Link to="/flashcards/study" style={{ color: darkMode ? '#c9a8ff' : '#6366f1', fontWeight: 600 }}>
                    Începe studiul →
                  </Link></>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{
            padding: '10px 14px',
            border: `1px dashed ${darkMode ? 'rgba(168,85,247,0.5)' : 'rgba(124,58,237,0.4)'}`,
            borderRadius: 6,
            color: darkMode ? '#c9a8ff' : '#6b21a8',
            fontSize: 14,
          }}>
            🔒 Funcțiile AI (quiz și explicații) sunt disponibile doar utilizatorilor logați.{' '}
            <Link to="/login" style={{ color: darkMode ? '#e8d4ff' : '#6366f1', fontWeight: 600 }}>
              Conectează-te
            </Link>
            {' '}sau{' '}
            <Link to="/register" style={{ color: darkMode ? '#e8d4ff' : '#6366f1', fontWeight: 600 }}>
              creează un cont
            </Link>.
          </div>
        )}
      </section>

      {/* Raportează */}
      {user && !isAuthor && (
        <div className="no-print" style={{ marginTop: 12 }}>
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
          <div style={modalBox(darkMode)}>
            <h3 style={{ marginTop: 0 }}>Raportează notița</h3>
            <form onSubmit={handleReportSubmit}>
              <label style={labelStyle}>
                Motiv
                <select value={reportReason} onChange={e => setReportReason(e.target.value)} style={inputStyle(darkMode)}>
                  {REPORT_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                Detalii <span style={{ color: darkMode ? '#a89bc4' : '#888', fontWeight: 400 }}>(opțional)</span>
                <textarea
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle(darkMode), resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={submittingReport} style={btnPrimary(darkMode)}>
                  {submittingReport ? 'Se trimite...' : 'Trimite raport'}
                </button>
                <button type="button" onClick={() => setShowReport(false)} style={btnSecondary(darkMode)}>
                  Anulează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notițe similare (D1) */}
      <div className="no-print">
        <SimilarNotes noteId={id} darkMode={darkMode} />
      </div>

      {/* Validări profesori — vizibil pentru toată lumea, acțiuni doar profesori */}
      <div className="no-print">
        <TeacherValidationPanel note={note} />
      </div>

      {/* Comentarii cu threading */}
      <div className="no-print">
        <CommentsSection noteId={id} initialComments={comments} noteAuthorId={note.authorId} />
      </div>
    </article>
  );
}

function SimilarNotes({ noteId, darkMode }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/notes/${noteId}/similar`, { params: { limit: 6 } })
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [noteId]);

  if (loading) return null;
  if (items.length === 0) return null;

  // Filtrăm out cele cu similarity foarte mică ca să nu arătăm "rezultate" slabe.
  const good = items.filter(n => (n.similarity ?? 0) > 0.5);
  if (good.length === 0) return null;

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12, color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>
        🔗 Notițe similare
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {good.map(n => {
          const sim = Math.round((n.similarity ?? 0) * 100);
          return (
            <Link key={n.id} to={`/notes/${n.id}`} style={{
              textDecoration: 'none', color: 'inherit',
              padding: 12, borderRadius: 8,
              border: darkMode ? '1px solid rgba(120, 60, 200, 0.2)' : '1px solid rgba(244, 114, 182, 0.25)',
              background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.6)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <strong style={{ fontSize: 14, color: darkMode ? '#e8e0ff' : '#1a1a1a', lineHeight: 1.3 }}>
                  {n.title}
                </strong>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10, whiteSpace: 'nowrap',
                  color: sim >= 75 ? '#16a34a' : sim >= 60 ? '#a16207' : '#6b7280',
                  background: sim >= 75 ? 'rgba(34,197,94,0.15)' : sim >= 60 ? 'rgba(234,179,8,0.15)' : 'rgba(156,163,175,0.15)',
                }}>{sim}%</span>
              </div>
              <span style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#888' }}>
                {n.subject} • a {n.gradeLevel}-a
              </span>
              <span style={{ fontSize: 11, color: darkMode ? '#867aa3' : '#aaa' }}>
                de {n.author?.username}
                {n.author?.isTeacher && <span title="Profesor verificat" style={{ marginLeft: 4, color: '#22c55e' }}>✓</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Styles
const labelStyle = { display: 'block', marginBottom: 12, fontWeight: 500 };
const inputStyle = (darkMode) => ({
  display: 'block',
  width: '100%',
  padding: 8,
  marginTop: 4,
  background: darkMode ? 'transparent' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});
const btnPrimary = (darkMode) => ({
  padding: '8px 16px',
  background: darkMode ? 'rgba(120, 40, 200, 0.3)' : '#0066cc',
  color: darkMode ? '#c9a8ff' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.55)' : 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 500,
});
const btnSecondary = (darkMode) => ({
  padding: '8px 16px',
  background: 'transparent',
  color: darkMode ? '#c9a8ff' : '#333',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #ccc',
  borderRadius: 6,
  cursor: 'pointer',
});
const btnDanger = {
  padding: '8px 16px',
  background: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};
const modalOverlay = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};
const modalBox = (darkMode) => ({
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ddd',
  color: darkMode ? '#e8e0ff' : '#222',
  padding: 24,
  borderRadius: 12,
  maxWidth: 480,
  width: '100%',
  margin: '0 16px',
  boxShadow: darkMode
    ? '0 20px 60px rgba(120, 40, 200, 0.4)'
    : '0 20px 60px rgba(0,0,0,0.2)',
  backdropFilter: 'blur(14px)',
});
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

const deletionBannerStyle = (darkMode) => ({
  margin: '16px 0 24px',
  padding: 16,
  borderRadius: 10,
  background: darkMode ? 'rgba(245, 158, 11, 0.12)' : '#fef3c7',
  border: darkMode ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid #fcd34d',
  color: darkMode ? '#fcd34d' : '#92400e',
});

const appealTextarea = (darkMode) => ({
  width: '100%', padding: 10, borderRadius: 6,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #d1d5db',
  background: darkMode ? 'rgba(0,0,0,0.25)' : '#fff',
  color: 'inherit', fontFamily: 'inherit', fontSize: 14, resize: 'vertical',
  boxSizing: 'border-box',
});
