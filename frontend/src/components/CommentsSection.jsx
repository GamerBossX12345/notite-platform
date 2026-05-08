// Componenta Comments cu Threading
import { useState } from 'react';
import { api } from '../api/client.js';

export function CommentsSection({ noteId, initialComments = [] }) {
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

      {/* Form pentru comentariu nou */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Scrie un comentariu..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: loading || !newComment.trim() ? 0.6 : 1,
          }}
        >
          {loading ? 'Se trimite...' : 'Postează'}
        </button>
      </form>

      {/* Lista comentarii */}
      <div>
        {comments.length === 0 ? (
          <p style={{ color: '#999' }}>Nici un comentariu. Fi prima persoană!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
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

function CommentItem({ comment, onReply, onDelete, isReplying, onSubmitReply, loading }) {
  const [replyText, setReplyText] = useState('');

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSubmitReply(replyText);
    setReplyText('');
  };

  return (
    <div style={{ marginBottom: '16px', paddingLeft: '0px' }}>
      <div style={{
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        borderLeft: '3px solid #0066cc',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <strong>{comment.user?.username || 'Anonim'}</strong>
            <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>
              {new Date(comment.createdAt).toLocaleDateString('ro')}
            </span>
          </div>
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#333' }}>
          {comment.content}
        </p>
        <button
          onClick={onReply}
          style={{
            marginTop: '8px',
            background: 'none',
            border: 'none',
            color: '#0066cc',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {isReplying ? 'Anulează' : 'Răspunde'}
        </button>
      </div>

      {/* Reply form */}
      {isReplying && (
        <form onSubmit={handleReplySubmit} style={{ marginTop: '8px', marginLeft: '16px' }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Scrie un răspuns..."
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          />
          <button
            type="submit"
            disabled={loading || !replyText.trim()}
            style={{
              marginTop: '4px',
              padding: '6px 12px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              opacity: loading || !replyText.trim() ? 0.6 : 1,
            }}
          >
            {loading ? '...' : 'Postează răspuns'}
          </button>
        </form>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: '12px', marginLeft: '16px', borderLeft: '2px solid #eee', paddingLeft: '12px' }}>
          {comment.replies.map((reply) => (
            <div key={reply.id} style={{ marginBottom: '8px', fontSize: '13px' }}>
              <strong>{reply.user?.username}</strong> - {reply.content}
              <span style={{ color: '#999', fontSize: '11px', marginLeft: '8px' }}>
                {new Date(reply.createdAt).toLocaleDateString('ro')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
