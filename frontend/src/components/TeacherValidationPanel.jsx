// Panou de validare profesori — apare sub conținutul notiței.
// - Toți userii văd verdictele existente (CORRECT / INCORRECT) cu username.
// - Profesorii verificați (alții decât autorul) pot da/retrage propriul verdict
//   și pot atașa un mesaj scurt cu motivul.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { TeacherBadge } from './Badges.jsx';

export function TeacherValidationPanel({ note }) {
  const { user, darkMode } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ro-RO';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [pendingVerdict, setPendingVerdict] = useState(null);

  const isTeacher = !!user?.isTeacher;
  const isAuthor  = user && note && user.id === note.authorId;
  const canValidate = isTeacher && !isAuthor;
  const myValidation = items.find(v => v.teacher?.id === user?.id) || null;

  useEffect(() => {
    if (!note?.id) return;
    setLoading(true);
    api.get(`/notes/${note.id}/validations`)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [note?.id]);

  async function submit(verdict, commentText) {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/notes/${note.id}/validate`, {
        verdict,
        comment: commentText || undefined,
      });
      setItems(prev => {
        const others = prev.filter(v => v.teacher?.id !== user.id);
        return [data, ...others];
      });
      setShowCommentBox(false);
      setPendingVerdict(null);
      setComment('');
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!confirm(t('common.confirm') + '?')) return;
    setSubmitting(true);
    try {
      await api.delete(`/notes/${note.id}/validate`);
      setItems(prev => prev.filter(v => v.teacher?.id !== user.id));
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  // Sumar pe verdicte — apare ca pastile chiar dacă nu există încă nicio validare.
  const correctCount   = items.filter(v => v.verdict === 'CORRECT').length;
  const incorrectCount = items.filter(v => v.verdict === 'INCORRECT').length;

  return (
    <section style={{
      marginTop: 32, paddingTop: 20,
      borderTop: darkMode ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid #e5e7eb',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 18, color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>
          {t('note.validate')}
        </h3>
        <span style={summaryPill('correct', darkMode)}>
          ✓ {correctCount}
        </span>
        <span style={summaryPill('incorrect', darkMode)}>
          ✗ {incorrectCount}
        </span>
      </div>

      {canValidate && (
        <div style={{ marginTop: 14 }}>
          {!showCommentBox ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setPendingVerdict('CORRECT'); setShowCommentBox(true); }}
                disabled={submitting}
                style={actionBtn('correct', myValidation?.verdict === 'CORRECT')}
              >
                ✓ {t('note.markCorrect')}
              </button>
              <button
                onClick={() => { setPendingVerdict('INCORRECT'); setShowCommentBox(true); }}
                disabled={submitting}
                style={actionBtn('incorrect', myValidation?.verdict === 'INCORRECT')}
              >
                ✗ {t('note.markIncorrect')}
              </button>
              {myValidation && (
                <button onClick={handleRemove} disabled={submitting} style={removeBtn(darkMode)}>
                  {t('common.delete')}
                </button>
              )}
            </div>
          ) : (
            <div style={{
              marginTop: 8, padding: 12, borderRadius: 8,
              border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #e5e7eb',
              background: darkMode ? 'rgba(20, 8, 50, 0.5)' : '#fafafa',
            }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={t('common.details')}
                style={textareaStyle(darkMode)}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => submit(pendingVerdict, comment.trim())}
                  disabled={submitting}
                  style={actionBtn(pendingVerdict === 'CORRECT' ? 'correct' : 'incorrect', true)}
                >
                  {submitting ? t('banned.submitting') : t('common.submit')}
                </button>
                <button
                  onClick={() => { setShowCommentBox(false); setPendingVerdict(null); setComment(''); }}
                  style={cancelBtn(darkMode)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <p style={{ color: darkMode ? '#a89bc4' : '#888', fontSize: 13 }}>{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <p style={{ color: darkMode ? '#a89bc4' : '#888', fontSize: 13 }}>
            —
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(v => (
              <div key={v.id} style={validationItemStyle(v.verdict, darkMode)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>
                    {v.verdict === 'CORRECT' ? '✓' : '✗'}
                  </span>
                  <strong style={{ color: darkMode ? '#e8e0ff' : '#1a1a1a' }}>
                    {v.teacher?.username || '—'}
                  </strong>
                  <TeacherBadge />
                  <span style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#666', marginLeft: 'auto' }}>
                    {new Date(v.createdAt).toLocaleDateString(locale)}
                  </span>
                </div>
                {v.comment && (
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: darkMode ? '#d4c8ff' : '#333', whiteSpace: 'pre-wrap' }}>
                    {v.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function summaryPill(kind, darkMode) {
  const isCorrect = kind === 'correct';
  return {
    padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
    color: isCorrect
      ? (darkMode ? '#6ee7b7' : '#065f46')
      : (darkMode ? '#fca5a5' : '#991b1b'),
    background: isCorrect
      ? (darkMode ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5')
      : (darkMode ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2'),
    border: isCorrect
      ? (darkMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #34d399')
      : (darkMode ? '1px solid rgba(220, 38, 38, 0.4)' : '1px solid #fca5a5'),
  };
}

function actionBtn(kind, active) {
  const isCorrect = kind === 'correct';
  return {
    padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
    fontWeight: 600, fontSize: 13,
    border: isCorrect ? '1px solid #16a34a' : '1px solid #dc2626',
    background: active
      ? (isCorrect ? '#16a34a' : '#dc2626')
      : 'transparent',
    color: active ? 'white' : (isCorrect ? '#16a34a' : '#dc2626'),
  };
}

function removeBtn(darkMode) {
  return {
    padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
    background: 'transparent',
    color: darkMode ? '#a89bc4' : '#6b7280',
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #d1d5db',
  };
}

function cancelBtn(darkMode) {
  return {
    padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
    background: 'transparent',
    color: darkMode ? '#c9a8ff' : '#374151',
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #d1d5db',
  };
}

function textareaStyle(darkMode) {
  return {
    width: '100%', padding: 10, borderRadius: 6,
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #d1d5db',
    background: darkMode ? 'rgba(0, 0, 0, 0.25)' : '#fff',
    color: darkMode ? '#e8e0ff' : '#222',
    fontFamily: 'inherit', fontSize: 14, resize: 'vertical',
    boxSizing: 'border-box',
  };
}

function validationItemStyle(verdict, darkMode) {
  const isCorrect = verdict === 'CORRECT';
  return {
    padding: 10, borderRadius: 8,
    background: isCorrect
      ? (darkMode ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5')
      : (darkMode ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2'),
    borderLeft: isCorrect ? '3px solid #16a34a' : '3px solid #dc2626',
    border: isCorrect
      ? (darkMode ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #a7f3d0')
      : (darkMode ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid #fecaca'),
    borderLeftWidth: 3,
  };
}
