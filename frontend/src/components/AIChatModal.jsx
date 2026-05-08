// Modal chat cu AI — utilizatorul poate cere explicații despre conținutul notei.
import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client.js';
import { X, Send } from 'lucide-react';

export function AIChatModal({ noteId, noteTitle, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Mesaj de bun venit la prima deschidere
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Bună! Sunt asistentul tău AI pentru notița "${noteTitle}". Poți să mă întrebi orice despre conținut — să-ți explic un concept, să rezum o parte sau să răspund la întrebări.`,
      }]);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll automat la ultimul mesaj
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    // Trimite doar mesajele user/assistant (fără primul mesaj de bun venit al asistentului)
    const history = newMessages
      .slice(1) // sare peste mesajul de bun venit
      .slice(-10) // ultimele 10
      .slice(0, -1); // fără ultimul (userMsg curent, trimis separat)

    try {
      const { data } = await api.post(`/notes/${noteId}/chat`, {
        message: text,
        history,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Eroare la conectarea cu AI. Încearcă din nou.';
      setError(msg);
      // Scoate mesajul utilizatorului dacă a eșuat
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
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
    <div style={overlay}>
      <div style={box}>
        {/* Header */}
        <div style={header}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Asistent AI</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Întreabă orice despre această notiță
            </div>
          </div>
          <button onClick={handleClose} style={closeBtn} title="Închide">
            <X size={20} />
          </button>
        </div>

        {/* Mesaje */}
        <div style={messageList}>
          {messages.map((msg, idx) => (
            <div key={idx} style={msg.role === 'user' ? userBubbleWrap : aiBubbleWrap}>
              <div style={msg.role === 'user' ? userBubble : aiBubble}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={aiBubbleWrap}>
              <div style={{ ...aiBubble, color: '#999', fontStyle: 'italic' }}>
                Se gândește...
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '8px 12px', color: '#d32f2f', fontSize: 13, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={inputRow}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrie o întrebare... (Enter pentru trimite, Shift+Enter pentru linie nouă)"
            disabled={loading}
            rows={2}
            style={inputArea}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              ...sendBtn,
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
            title="Trimite"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1100,
};
const box = {
  background: 'white',
  borderRadius: 12,
  width: '90%',
  maxWidth: 560,
  height: '75vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
const header = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid #eee',
  flexShrink: 0,
};
const closeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#666', padding: 4, borderRadius: 4,
  display: 'flex', alignItems: 'center',
};
const messageList = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};
const userBubbleWrap = { display: 'flex', justifyContent: 'flex-end' };
const aiBubbleWrap   = { display: 'flex', justifyContent: 'flex-start' };
const userBubble = {
  background: '#0066cc', color: 'white',
  padding: '10px 14px', borderRadius: '18px 18px 4px 18px',
  maxWidth: '80%', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
};
const aiBubble = {
  background: '#f0f0f0', color: '#222',
  padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
  maxWidth: '80%', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
};
const inputRow = {
  display: 'flex', gap: 8, padding: '12px 16px',
  borderTop: '1px solid #eee', alignItems: 'flex-end',
  flexShrink: 0,
};
const inputArea = {
  flex: 1, padding: '10px 12px',
  border: '1px solid #ddd', borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit',
  resize: 'none', outline: 'none',
  lineHeight: 1.4,
};
const sendBtn = {
  padding: '10px 12px',
  background: '#0066cc', color: 'white',
  border: 'none', borderRadius: 8,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};
