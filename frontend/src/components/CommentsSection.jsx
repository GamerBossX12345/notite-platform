// Componenta Comments cu Threading
import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

export function CommentsSection({ noteId, initialComments = [] }) {
  const { darkMode } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);

  const submitComment = async (text, parentId = null) => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await api.post(`/notes/${noteId}/comments`, {
        content: text,
        parentId,
      });

      if (parentId) {
        setComments(prev => prev.map(c =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), response.data] }
            : c
        ));
        setReplyingTo(null);
      } else {
        setComments(prev => [response.data, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Eroare: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitComment(newComment);
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Ștergi comentariul?')) return;

    try {
      await api.delete(`/notes/${noteId}/comments/${commentId}`);
      setComments(prev =>
        prev
          .map(c =>
            c.id === commentId
              ? null
              : { ...c, replies: c.replies?.filter(r => r.id !== commentId) }
          )
          .filter(Boolean)
      );
    } catch (err) {
      alert('Eroare: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <h3>💬 Comentarii ({comments.length})</h3>

      {/* Form comentariu nou */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Scrie un comentariu..."
          style={textareaStyle(darkMode, 80)}
        />
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          style={{ ...primaryBtnStyle(darkMode), marginTop: 8, opacity: loading || !newComment.trim() ? 0.5 : 1 }}
        >
          {loading ? 'Se trimite...' : 'Postează'}
        </button>
      </form>

      <div>
        {comments.length === 0 ? (
          <p style={{ color: darkMode ? '#a89bc4' : '#999' }}>Niciun comentariu. Fii prima persoană!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              darkMode={darkMode}
              onReply={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              onDelete={() => handleDelete(comment.id)}
              isReplying={replyingTo === comment.id}
              onSubmitReply={(text) => submitComment(text, comment.id)}
              loading={loading}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, darkMode, onReply, onDelete, isReplying, onSubmitReply, loading }) {
  const [replyText, setReplyText] = useState('');

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSubmitReply(replyText);
    setReplyText('');
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={commentBoxStyle(darkMode)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <strong style={{ color: darkMode ? '#e8e0ff' : '#222' }}>
              {comment.user?.username || 'Anonim'}
            </strong>
            <span style={{ color: darkMode ? '#a89bc4' : '#999', fontSize: 12, marginLeft: 8 }}>
              {new Date(comment.createdAt).toLocaleDateString('ro')}
            </span>
          </div>
          <button onClick={onDelete} style={deleteBtnStyle(darkMode)} title="Șterge">
            ✕
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: darkMode ? '#d8cfee' : '#333' }}>
          {comment.content}
        </p>
        <button onClick={onReply} style={replyToggleStyle(darkMode)}>
          {isReplying ? 'Anulează' : 'Răspunde'}
        </button>
      </div>

      {/* Reply form */}
      {isReplying && (
        <form onSubmit={handleReplySubmit} style={{ marginTop: 8, marginLeft: 16 }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Scrie un răspuns..."
            style={textareaStyle(darkMode, 60)}
          />
          <button
            type="submit"
            disabled={loading || !replyText.trim()}
            style={{
              ...primaryBtnStyle(darkMode),
              marginTop: 4, padding: '6px 12px', fontSize: 12,
              opacity: loading || !replyText.trim() ? 0.5 : 1,
            }}
          >
            {loading ? '...' : 'Postează răspuns'}
          </button>
        </form>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={repliesContainerStyle(darkMode)}>
          {comment.replies.map((reply) => (
            <div key={reply.id} style={replyItemStyle(darkMode)}>
              <strong style={{ color: darkMode ? '#e8e0ff' : '#222' }}>
                {reply.user?.username}
              </strong>
              <span style={{ color: darkMode ? '#d8cfee' : '#333' }}> – {reply.content}</span>
              <span style={{ color: darkMode ? '#a89bc4' : '#999', fontSize: 11, marginLeft: 8 }}>
                {new Date(reply.createdAt).toLocaleDateString('ro')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stiluri ──────────────────────────────────────────────────────────────────
const textareaStyle = (darkMode, minHeight) => ({
  width: '100%',
  minHeight,
  padding: 12,
  background: darkMode ? 'transparent' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ddd',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});

const primaryBtnStyle = (darkMode) => ({
  padding: '8px 16px',
  background: darkMode ? 'rgba(120, 40, 200, 0.3)' : '#0066cc',
  color: darkMode ? '#c9a8ff' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.55)' : 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  transition: 'background 0.2s ease, border-color 0.2s ease',
});

const commentBoxStyle = (darkMode) => ({
  padding: 12,
  background: darkMode ? 'rgba(255, 255, 255, 0.04)' : '#f5f5f5',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.18)' : 'none',
  borderRadius: 6,
  borderLeft: darkMode ? '3px solid rgba(168, 85, 247, 0.7)' : '3px solid #0066cc',
});

const deleteBtnStyle = (darkMode) => ({
  background: 'transparent',
  border: 'none',
  color: darkMode ? '#a89bc4' : '#999',
  cursor: 'pointer',
  fontSize: 13,
  padding: '0 4px',
  lineHeight: 1,
});

const replyToggleStyle = (darkMode) => ({
  marginTop: 8,
  background: 'transparent',
  border: 'none',
  color: darkMode ? '#c9a8ff' : '#0066cc',
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
});

const repliesContainerStyle = (darkMode) => ({
  marginTop: 12,
  marginLeft: 16,
  paddingLeft: 12,
  borderLeft: darkMode ? '2px solid rgba(168, 85, 247, 0.2)' : '2px solid #eee',
});

const replyItemStyle = (darkMode) => ({
  marginBottom: 8,
  fontSize: 13,
  color: darkMode ? '#d8cfee' : '#333',
});
