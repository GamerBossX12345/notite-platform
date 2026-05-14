// Input pentru tag-uri cu autocomplete din lista globală (oficial + user).
// Userul poate adăuga și tag-uri noi tastând și apăsând Enter sau virgulă.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

export function TagInput({ value, onChange, max = 8 }) {
  const { darkMode } = useAuth();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef(null);

  // Fetch sugestii din DB la fiecare schimbare de input.
  useEffect(() => {
    let cancelled = false;
    const q = input.trim().toLowerCase();
    const params = q ? { q, limit: 8 } : { limit: 8 };
    api.get('/notes/tags', { params })
      .then(res => {
        if (cancelled) return;
        // Eliminăm cele deja selectate.
        const filtered = res.data.filter(t => !value.includes(t.name));
        setSuggestions(filtered);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [input, value]);

  // Click în afara componentei → închide sugestiile.
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function add(name) {
    const clean = name?.toString().trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 32);
    if (!clean || value.includes(clean) || value.length >= max) return;
    onChange([...value, clean]);
    setInput('');
  }

  function remove(name) {
    onChange(value.filter(t => t !== name));
  }

  function onKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={wrapStyle(darkMode)}>
        {value.map(tag => (
          <span key={tag} style={chipStyle(darkMode)}>
            #{tag}
            <button type="button" onClick={() => remove(tag)} style={removeBtnStyle(darkMode)} aria-label="Elimină">×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={value.length >= max ? `Maxim ${max} tag-uri` : 'Adaugă tag (Enter sau virgulă)...'}
          disabled={value.length >= max}
          style={inputStyle(darkMode)}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div style={suggestionsStyle(darkMode)}>
          {suggestions.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { add(t.name); setShowSuggestions(false); }}
              style={suggestionItemStyle(darkMode)}
            >
              {t.isOfficial && <span title="Tag oficial" style={{ color: '#a855f7' }}>★</span>}
              <span style={{ flex: 1, textAlign: 'left' }}>#{t.name}</span>
              {t.noteCount > 0 && <span style={{ fontSize: 11, opacity: 0.6 }}>{t.noteCount}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const wrapStyle = (darkMode) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
  padding: 8,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.25)' : '1px solid rgba(244, 114, 182, 0.4)',
  borderRadius: 6,
  background: darkMode ? 'rgba(0, 0, 0, 0.3)' : '#fff',
  minHeight: 38,
});

const chipStyle = (darkMode) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 13,
  background: darkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(244, 114, 182, 0.18)',
  color: darkMode ? '#e8d4ff' : '#9333ea',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(244, 114, 182, 0.5)',
});

const removeBtnStyle = (darkMode) => ({
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
  marginLeft: 2,
});

const inputStyle = (darkMode) => ({
  flex: 1,
  minWidth: 120,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: darkMode ? '#e8e0ff' : '#222',
  padding: '2px 4px',
  fontSize: 14,
});

const suggestionsStyle = (darkMode) => ({
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 4,
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : '#fff',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #e0e0e0',
  borderRadius: 6,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
  maxHeight: 220,
  overflowY: 'auto',
  zIndex: 50,
});

const suggestionItemStyle = (darkMode) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  color: darkMode ? '#e8e0ff' : '#222',
  cursor: 'pointer',
  fontSize: 14,
  textAlign: 'left',
});
