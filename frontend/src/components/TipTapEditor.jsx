import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Mathematics from '@tiptap/extension-mathematics';
import Placeholder from '@tiptap/extension-placeholder';
import 'katex/dist/katex.min.css';

export function useEditorSetup(initialContent = '') {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Mathematics.configure({ HTMLAttributes: { class: 'math-extension' } }),
      Placeholder.configure({ placeholder: 'Scrie conținutul notei...' }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-full',
      },
    },
  });

  return editor;
}

export function TipTapEditor({ editor, editorClassName = '' }) {
  if (!editor) return null;

  const btn = {
    padding: '6px 12px',
    margin: '2px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  };
  const activeBtn = { ...btn, backgroundColor: '#0066cc', color: 'white' };

  return (
    <div className={editorClassName} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}>
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
        <button
          type="button"
          onClick={() => {
            const formula = prompt('Formulă LaTeX (ex: e = mc^2):');
            if (formula) {
              editor.chain().focus().insertContent({
                type: 'mathInline',
                attrs: { latex: formula },
              }).run();
            }
          }}
          style={btn}
          title="Math Formula (LaTeX)"
        >∑</button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} style={btn} title="Undo">↶</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} style={btn} title="Redo">↷</button>
      </div>

      <EditorContent
        editor={editor}
        style={{
          minHeight: '300px',
          padding: '12px',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          fontSize: '16px',
        }}
      />

      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          color: #aaa;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export function TipTapRenderer({ htmlContent }) {
  return (
    <div
      className="tiptap-render"
      style={{ fontSize: '16px', lineHeight: '1.6', color: '#333' }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
