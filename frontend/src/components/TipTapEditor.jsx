import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Mathematics from '@tiptap/extension-mathematics';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import 'katex/dist/katex.min.css';
import { useAuth } from '../hooks/useAuth.js';

const LATEX_PRESETS = [
  { label: 'x²',     latex: 'x^{2}',                     group: 'putere' },
  { label: 'xₙ',     latex: 'x_{n}',                     group: 'indice' },
  { label: '√',      latex: '\\sqrt{x}',                 group: 'rădăcină' },
  { label: '∛',      latex: '\\sqrt[3]{x}',              group: 'rădăcină cubică' },
  { label: 'a/b',    latex: '\\frac{a}{b}',              group: 'fracție' },
  { label: 'Σ',      latex: '\\sum_{i=1}^{n} x_{i}',     group: 'sumă' },
  { label: '∏',      latex: '\\prod_{i=1}^{n} x_{i}',    group: 'produs' },
  { label: '∫',      latex: '\\int_{a}^{b} f(x)\\,dx',   group: 'integrală' },
  { label: 'lim',    latex: '\\lim_{x \\to \\infty}',    group: 'limită' },
  { label: '∂',      latex: '\\frac{\\partial f}{\\partial x}', group: 'derivată parțială' },
  { label: 'π',      latex: '\\pi' },
  { label: 'α',      latex: '\\alpha' },
  { label: 'β',      latex: '\\beta' },
  { label: 'θ',      latex: '\\theta' },
  { label: 'λ',      latex: '\\lambda' },
  { label: 'Ω',      latex: '\\Omega' },
  { label: '∞',      latex: '\\infty' },
  { label: '≤',      latex: '\\leq' },
  { label: '≥',      latex: '\\geq' },
  { label: '≠',      latex: '\\neq' },
  { label: '≈',      latex: '\\approx' },
  { label: '→',      latex: '\\to' },
  { label: '⟹',     latex: '\\implies' },
  { label: '∈',      latex: '\\in' },
  { label: '∉',      latex: '\\notin' },
  { label: '⊂',      latex: '\\subset' },
  { label: '∪',      latex: '\\cup' },
  { label: '∩',      latex: '\\cap' },
];

// Match watch?v=, youtu.be, embed/, shorts/
const YT_REGEX = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})(?:\S*)?$/i;

export function useEditorSetup(initialContent = '') {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Mathematics.configure({ HTMLAttributes: { class: 'math-extension' } }),
      Placeholder.configure({ placeholder: 'Scrie conținutul notei...' }),
      Youtube.configure({
        controls: true, nocookie: true, modestBranding: true,
        width: 560, height: 315,
        HTMLAttributes: { class: 'tiptap-youtube' },
      }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-full',
      },
      // La paste, daca textul e un URL YouTube, inserează playerul în loc de link.
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain')?.trim();
        if (!text || !YT_REGEX.test(text)) return false;

        const node = view.state.schema.nodes.youtube?.create({ src: text });
        if (!node) return false;

        view.dispatch(view.state.tr.replaceSelectionWith(node));
        return true;
      },
    },
  });

  return editor;
}

export function TipTapEditor({ editor, editorClassName = '' }) {
  const { darkMode } = useAuth();
  const [mathOpen, setMathOpen]     = useState(false);
  const [mathLatex, setMathLatex]   = useState('');
  if (!editor) return null;

  function insertMath(latex) {
    if (!latex?.trim()) return;
    editor.chain().focus().insertContent({
      type: 'mathInline',
      attrs: { latex: latex.trim() },
    }).run();
  }

  const btn = {
    padding: '6px 12px',
    margin: '2px',
    background: darkMode ? 'transparent' : '#f0f0f0',
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ddd',
    color: darkMode ? '#e8e0ff' : '#333',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
  };
  const activeBtn = {
    ...btn,
    background: darkMode ? 'rgba(120, 40, 200, 0.35)' : '#0066cc',
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.8)' : '1px solid #0066cc',
    color: darkMode ? '#e8e0ff' : 'white',
    fontWeight: 600,
  };

  const containerStyle = {
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px',
    background: darkMode ? 'transparent' : '#fff',
    transition: 'background 0.4s ease, border-color 0.4s ease',
  };

  const editorContentStyle = {
    minHeight: '300px',
    padding: '12px',
    background: darkMode ? 'rgba(10, 5, 25, 0.4)' : '#fafafa',
    border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
    borderRadius: '6px',
    fontSize: '16px',
    color: darkMode ? '#e8e0ff' : '#222',
    transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
  };

  return (
    <div className={editorClassName} style={containerStyle}>
      <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          style={editor.isActive('bold') ? activeBtn : btn} title="Bold"><strong>B</strong></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          style={editor.isActive('italic') ? activeBtn : btn} title="Italic"><em>I</em></button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()}
          style={editor.isActive('code') ? activeBtn : btn} title="Code">{'<>'}</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          style={editor.isActive('heading', { level: 1 }) ? activeBtn : btn} title="Heading 1">H1</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          style={editor.isActive('heading', { level: 2 }) ? activeBtn : btn} title="Heading 2">H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={editor.isActive('bulletList') ? activeBtn : btn} title="Bullet List">•</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          style={editor.isActive('orderedList') ? activeBtn : btn} title="Ordered List">1.</button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          style={editor.isActive('codeBlock') ? activeBtn : btn} title="Code Block">{'{}'}</button>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={() => setMathOpen(o => !o)}
            style={mathOpen ? activeBtn : btn}
            title="Formulă (LaTeX)"
          >∑</button>
          {mathOpen && (
            <div style={mathPopoverStyle(darkMode)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Formule (LaTeX)</strong>
                <button type="button" onClick={() => setMathOpen(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, opacity: 0.7 }}>
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 10 }}>
                {LATEX_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { insertMath(p.latex); setMathOpen(false); }}
                    title={p.group ? `${p.group} (${p.latex})` : p.latex}
                    style={mathPresetBtn(darkMode)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, opacity: 0.8 }}>
                Sau scrie LaTeX custom:
              </label>
              <input
                type="text"
                value={mathLatex}
                onChange={e => setMathLatex(e.target.value)}
                placeholder="ex: E = mc^2"
                style={mathInputStyle(darkMode)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    insertMath(mathLatex);
                    setMathLatex('');
                    setMathOpen(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => { insertMath(mathLatex); setMathLatex(''); setMathOpen(false); }}
                disabled={!mathLatex.trim()}
                style={{ ...btn, marginTop: 6, width: '100%' }}
              >
                Inserează formula
              </button>
            </div>
          )}
        </span>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} style={btn} title="Undo">↶</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} style={btn} title="Redo">↷</button>
      </div>

      <EditorContent editor={editor} style={editorContentStyle} />

      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          color: ${darkMode ? '#7a6c8a' : '#aaa'};
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

const mathPopoverStyle = (darkMode) => ({
  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
  width: 320, padding: 12, borderRadius: 8,
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : '#ffffff',
  color: darkMode ? '#e8e0ff' : '#222',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid #d1d5db',
  boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.15)',
});

const mathPresetBtn = (darkMode) => ({
  padding: '6px 4px', borderRadius: 4, cursor: 'pointer',
  background: darkMode ? 'rgba(168, 85, 247, 0.12)' : '#f3f4f6',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #e5e7eb',
  color: 'inherit', fontSize: 13, fontFamily: 'serif',
});

const mathInputStyle = (darkMode) => ({
  width: '100%', padding: '6px 8px', borderRadius: 4, fontSize: 13,
  fontFamily: 'monospace',
  background: darkMode ? 'rgba(0,0,0,0.3)' : '#fff',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #d1d5db',
  color: 'inherit', boxSizing: 'border-box',
});

export function TipTapRenderer({ content }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      Image,
      Mathematics.configure({ HTMLAttributes: { class: 'math-extension' } }),
      Youtube.configure({
        controls: true, nocookie: true, modestBranding: true,
        width: 560, height: 315,
        HTMLAttributes: { class: 'tiptap-youtube' },
      }),
    ],
    content: content || '',
    editable: false,
  });

  return (
    <EditorContent
      editor={editor}
      className="tiptap-render"
      style={{ fontSize: '16px', lineHeight: '1.6' }}
    />
  );
}
