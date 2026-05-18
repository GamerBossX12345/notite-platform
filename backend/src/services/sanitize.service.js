// Sanitizare conținut user-generated. TipTap salvează conținutul ca JSON cu
// noduri/marks dintr-un set bine definit; verificăm whitelist-ul nostru ca
// nimic neașteptat să nu treacă prin (ex: nod custom cu HTML inline care
// ar ajunge să se randeze ca atare în viitor).
//
// Pentru text plain (comentarii, mesaje) folosim sanitize-html cu lista de
// taguri goală (= scoate tot HTML-ul, păstrează doar textul).

import sanitizeHtml from 'sanitize-html';

// Tipuri de noduri/marks TipTap permise. Le-am tras din extensiile folosite în
// TipTapEditor.jsx (StarterKit + Image + Link + Mathematics + YouTube + ...).
const ALLOWED_NODE_TYPES = new Set([
  'doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem',
  'blockquote', 'codeBlock', 'hardBreak', 'horizontalRule',
  'image', 'youtube', 'math', 'mathInline', 'mathBlock',
]);
const ALLOWED_MARK_TYPES = new Set([
  'bold', 'italic', 'strike', 'code', 'underline', 'link',
]);
// Pentru atribute pe noduri: care e permis pe fiecare tip. Restul se elimină.
const ALLOWED_NODE_ATTRS = {
  heading: ['level'],
  image:   ['src', 'alt', 'title'],
  youtube: ['src'],
  math:    ['latex'],
  mathInline: ['latex'],
  mathBlock:  ['latex'],
  codeBlock:  ['language'],
};
const ALLOWED_MARK_ATTRS = {
  link: ['href', 'target', 'rel'],
};

function isHttpUrl(url) {
  if (typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url) || url.startsWith('/uploads/');
}

// Curăță recursiv nodurile TipTap. Returnează un nod nou (NU modifică in-place).
export function sanitizeTipTapDoc(node) {
  if (!node || typeof node !== 'object') return null;

  // Doc fără type — invalid. Întoarcem un doc gol valid.
  if (!node.type) return { type: 'doc', content: [] };

  if (!ALLOWED_NODE_TYPES.has(node.type)) {
    // Dacă tipul nu e cunoscut, păstrăm doar textul descendent (dacă există).
    return { type: 'paragraph', content: [] };
  }

  const cleaned = { type: node.type };

  // Atribute
  if (node.attrs && ALLOWED_NODE_ATTRS[node.type]) {
    const okAttrs = ALLOWED_NODE_ATTRS[node.type];
    const filteredAttrs = {};
    for (const k of okAttrs) {
      if (node.attrs[k] !== undefined) {
        let v = node.attrs[k];
        // Validare URL-uri pentru image/youtube
        if ((node.type === 'image' || node.type === 'youtube') && k === 'src') {
          if (!isHttpUrl(v)) continue;
        }
        filteredAttrs[k] = v;
      }
    }
    if (Object.keys(filteredAttrs).length > 0) cleaned.attrs = filteredAttrs;
  }

  // Text + marks (pentru noduri de tip 'text')
  if (node.type === 'text') {
    cleaned.text = typeof node.text === 'string' ? node.text : '';
    if (Array.isArray(node.marks)) {
      const cleanMarks = [];
      for (const m of node.marks) {
        if (!m?.type || !ALLOWED_MARK_TYPES.has(m.type)) continue;
        const cm = { type: m.type };
        if (m.attrs && ALLOWED_MARK_ATTRS[m.type]) {
          const okAttrs = ALLOWED_MARK_ATTRS[m.type];
          const filtered = {};
          for (const k of okAttrs) {
            if (m.attrs[k] !== undefined) {
              let v = m.attrs[k];
              if (m.type === 'link' && k === 'href' && !isHttpUrl(v)) continue;
              if (m.type === 'link' && k === 'target' && v !== '_blank') continue;
              filtered[k] = v;
            }
          }
          // Forțăm rel="noopener noreferrer" pe link-uri externe pentru a preveni
          // tabnabbing (window.opener attack).
          if (m.type === 'link' && filtered.href) {
            filtered.rel = 'noopener noreferrer';
            filtered.target = '_blank';
          }
          if (Object.keys(filtered).length > 0) cm.attrs = filtered;
        }
        cleanMarks.push(cm);
      }
      if (cleanMarks.length > 0) cleaned.marks = cleanMarks;
    }
  }

  // Children (recursive)
  if (Array.isArray(node.content)) {
    cleaned.content = node.content
      .map(child => sanitizeTipTapDoc(child))
      .filter(Boolean);
  }

  return cleaned;
}

// Pentru text plain user-generated: scoate complet HTML-ul.
export function sanitizePlainText(text, opts = {}) {
  if (typeof text !== 'string') return '';
  const cleaned = sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
  if (opts.maxLength) return cleaned.slice(0, opts.maxLength);
  return cleaned;
}
