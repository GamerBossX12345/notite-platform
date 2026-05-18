import { describe, it, expect } from 'vitest';
import { sanitizeTipTapDoc, sanitizePlainText } from '../services/sanitize.service.js';

describe('sanitizeTipTapDoc', () => {
  it('păstrează un doc valid neschimbat (semantic)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'salut' }] },
      ],
    };
    const out = sanitizeTipTapDoc(doc);
    expect(out.type).toBe('doc');
    expect(out.content[0].type).toBe('paragraph');
    expect(out.content[0].content[0].text).toBe('salut');
  });

  it('elimină noduri de tip necunoscut (potențial XSS)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
      ],
    };
    const out = sanitizeTipTapDoc(doc);
    // Nodul `script` e înlocuit cu un paragraf gol (sanitizat).
    expect(out.content[0].type).toBe('paragraph');
    expect(out.content[0].content || []).toHaveLength(0);
  });

  it('elimină marks necunoscute', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'salut',
              marks: [
                { type: 'bold' },
                { type: 'evilMark', attrs: { onclick: 'alert(1)' } },
              ],
            },
          ],
        },
      ],
    };
    const out = sanitizeTipTapDoc(doc);
    const marks = out.content[0].content[0].marks;
    expect(marks).toHaveLength(1);
    expect(marks[0].type).toBe('bold');
  });

  it('respinge URL-uri javascript: pe image', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'x' } },
      ],
    };
    const out = sanitizeTipTapDoc(doc);
    // src nu trece validarea isHttpUrl → e șters; alt rămâne.
    expect(out.content[0].attrs?.src).toBeUndefined();
    expect(out.content[0].attrs?.alt).toBe('x');
  });

  it('forțează rel="noopener noreferrer" pe linkuri externe', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click',
              marks: [
                { type: 'link', attrs: { href: 'https://evil.com', target: '_self' } },
              ],
            },
          ],
        },
      ],
    };
    const out = sanitizeTipTapDoc(doc);
    const linkMark = out.content[0].content[0].marks[0];
    expect(linkMark.attrs.rel).toBe('noopener noreferrer');
    expect(linkMark.attrs.target).toBe('_blank');
  });

  it('elimină atribute necunoscute (chiar pe noduri permise)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2, onclick: 'pwn()' }, content: [] },
      ],
    };
    const out = sanitizeTipTapDoc(doc);
    expect(out.content[0].attrs.level).toBe(2);
    expect(out.content[0].attrs.onclick).toBeUndefined();
  });
});

describe('sanitizePlainText', () => {
  it('scoate complet tag-urile HTML', () => {
    expect(sanitizePlainText('<script>alert(1)</script>salut'))
      .toBe('salut');
    expect(sanitizePlainText('<b>bold</b> text'))
      .toBe('bold text');
  });

  it('păstrează entitățile HTML inofensive', () => {
    // sanitize-html decodează entitățile, dar nu introduce HTML executabil.
    const out = sanitizePlainText('5 &lt; 10');
    expect(out).toContain('5');
    expect(out).toContain('10');
    // Nu trebuie să apară tag-uri.
    expect(out).not.toContain('<');
  });

  it('respectă maxLength', () => {
    expect(sanitizePlainText('a'.repeat(1000), { maxLength: 10 }))
      .toHaveLength(10);
  });

  it('tratează input non-string fără să arunce eroare', () => {
    expect(sanitizePlainText(null)).toBe('');
    expect(sanitizePlainText(undefined)).toBe('');
    expect(sanitizePlainText(123)).toBe('');
  });
});
