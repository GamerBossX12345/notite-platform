// Modal chat cu AI — conversația e persistată per utilizator + per notiță,
// deci AI-ul "ține minte" discuția la redeschidere.
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { X, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

export function AIChatModal({ noteId, noteTitle, isOpen, onClose }) {
  const { darkMode } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Mesaj de întâmpinare — doar UI, nu se persistă în DB.
  const welcomeMsg = () => ({
    role: 'assistant',
    content: `${t('ai.chatTitle')} — "${noteTitle}"`,
  });

  // La deschidere: încarcă istoricul salvat din DB.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setHistoryLoading(true);
    api.get(`/notes/${noteId}/chat`)
      .then(res => {
        const saved = res.data || [];
        setMessages(saved.length === 0
          ? [welcomeMsg()]
          : saved.map(m => ({ role: m.role, content: m.content })));
      })
      .catch(() => setMessages([welcomeMsg()]))
      .finally(() => {
        setHistoryLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      });
  }, [isOpen, noteId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Istoricul e gestionat server-side (din DB) — nu-l mai trimitem.
      const { data } = await api.post(`/notes/${noteId}/chat`, { message: text });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const msg = err.response?.data?.error || t('common.sendError');
      setError(msg);
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const handleClearConversation = async () => {
    if (clearing) return;
    if (!window.confirm(t('common.confirm') + '?')) return;
    setClearing(true);
    setError(null);
    try {
      await api.delete(`/notes/${noteId}/chat`);
      setMessages([welcomeMsg()]);
    } catch (err) {
      setError(t('common.deleteError'));
    } finally {
      setClearing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInput('');
    setError(null);
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={boxStyle(darkMode)}>
        {/* Header */}
        <div style={headerStyle(darkMode)}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{t('ai.chatTitle')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleClearConversation}
              style={closeBtnStyle(darkMode)}
              aria-label={t('common.delete')}
              disabled={clearing}
            >
              <Trash2 size={16} />
            </button>
            <button onClick={handleClose} style={closeBtnStyle(darkMode)} aria-label={t('common.close')}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={messageListStyle}>
          {historyLoading && (
            <div style={{ ...aiBubbleWrap }}>
              <div style={{ ...aiBubble(darkMode), color: darkMode ? '#a89bc4' : '#999', fontStyle: 'italic' }}>
                {t('common.loading')}
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} style={msg.role === 'user' ? userBubbleWrap : aiBubbleWrap}>
              <div style={msg.role === 'user' ? userBubble(darkMode) : aiBubble(darkMode)}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={aiBubbleWrap}>
              <div style={{ ...aiBubble(darkMode), color: darkMode ? '#a89bc4' : '#999', fontStyle: 'italic' }}>
                {t('common.loading')}...
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '8px 12px', color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={inputRowStyle(darkMode)}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.chatPlaceholder')}
            disabled={loading}
            rows={2}
            style={inputAreaStyle(darkMode)}
            aria-label={t('ai.chatPlaceholder')}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              ...sendBtnStyle(darkMode),
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
            aria-label={t('common.send')}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1100, backdropFilter: 'blur(4px)',
};

const boxStyle = (darkMode) => ({
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ddd',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 12,
  width: '90%',
  maxWidth: 560,
  height: '75vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: darkMode
    ? '0 20px 60px rgba(120, 40, 200, 0.4)'
    : '0 20px 60px rgba(0,0,0,0.2)',
  backdropFilter: 'blur(14px)',
});

const headerStyle = (darkMode) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px',
  borderBottom: darkMode ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid #eee',
  flexShrink: 0,
});

const closeBtnStyle = (darkMode) => ({
  width: 32, height: 32,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: darkMode ? 'rgba(120, 40, 200, 0.15)' : '#f3f4f6',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #e0e0e0',
  color: darkMode ? '#c9a8ff' : '#555',
  borderRadius: 6, cursor: 'pointer',
  transition: 'background 0.2s ease, border-color 0.2s ease',
});

const messageListStyle = {
  flex: 1, overflowY: 'auto',
  padding: '16px 20px',
  display: 'flex', flexDirection: 'column', gap: 12,
};

const userBubbleWrap = { display: 'flex', justifyContent: 'flex-end' };
const aiBubbleWrap   = { display: 'flex', justifyContent: 'flex-start' };

const userBubble = (darkMode) => ({
  background: darkMode
    ? 'linear-gradient(135deg, rgba(120, 40, 200, 0.85) 0%, rgba(60, 100, 220, 0.85) 100%)'
    : '#0066cc',
  color: 'white',
  padding: '10px 14px', borderRadius: '18px 18px 4px 18px',
  maxWidth: '80%', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : 'none',
});

const aiBubble = (darkMode) => ({
  background: darkMode ? 'rgba(255, 255, 255, 0.06)' : '#f0f0f0',
  color: darkMode ? '#e8e0ff' : '#222',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.2)' : 'none',
  padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
  maxWidth: '80%', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
});

const inputRowStyle = (darkMode) => ({
  display: 'flex', gap: 8, padding: '12px 16px',
  borderTop: darkMode ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid #eee',
  alignItems: 'flex-end',
  flexShrink: 0,
});

const inputAreaStyle = (darkMode) => ({
  flex: 1, padding: '10px 12px',
  background: darkMode ? 'transparent' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ddd',
  color: darkMode ? '#e8e0ff' : '#222',
  borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit',
  resize: 'none', outline: 'none',
  lineHeight: 1.4,
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});

const sendBtnStyle = (darkMode) => ({
  padding: '10px 12px',
  background: darkMode ? 'rgba(120, 40, 200, 0.3)' : '#0066cc',
  color: darkMode ? '#c9a8ff' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.55)' : 'none',
  borderRadius: 8,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
  transition: 'background 0.2s ease, border-color 0.2s ease',
});
