// Istoric vizitare notițe — pur client-side (localStorage).
// Stocăm doar id + titlu + subject + timestamp, ca lista de pe homepage să nu
// necesite un GET separat pe fiecare notiță.

import { useCallback, useEffect, useState } from 'react';

const KEY = 'notite:recent-notes';
const MAX_ENTRIES = 8;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Returnează lista curentă + funcție de "track" (apelată din NotePage la mount).
export function useRecentNotes() {
  const [list, setList] = useState(() => readAll());

  // Sincronizează între tab-uri.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === KEY) setList(readAll());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const trackVisit = useCallback((note) => {
    if (!note?.id) return;
    const entry = {
      id: note.id,
      title: note.title,
      subject: note.subject,
      gradeLevel: note.gradeLevel,
      viewedAt: Date.now(),
    };
    const current = readAll().filter(n => n.id !== entry.id);
    const next = [entry, ...current].slice(0, MAX_ENTRIES);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setList(next);
    } catch {/* quota plin — ignorăm */}
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setList([]);
  }, []);

  const remove = useCallback((id) => {
    const next = readAll().filter(n => n.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    setList(next);
  }, []);

  return { recent: list, trackVisit, clear, remove };
}
