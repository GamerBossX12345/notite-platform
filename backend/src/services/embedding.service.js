import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Modelul se descarcă o singură dată și se cachează local
env.cacheDir = path.join(__dirname, '../../.model-cache');

let embedder = null;
let loadPromise = null;

async function getEmbedder() {
  if (embedder) return embedder;
  if (!loadPromise) {
    loadPromise = pipeline('feature-extraction', 'Xenova/multilingual-e5-small')
      .then(m => { embedder = m; return m; })
      .catch(err => { loadPromise = null; throw err; });
  }
  return loadPromise;
}

// Pre-încarcă modelul la pornirea serverului (fire-and-forget)
getEmbedder().catch(err =>
  console.error('[Embeddings] Model load failed:', err.message)
);

export async function generateEmbedding(text) {
  const model = await getEmbedder();
  const out = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

// Construiește textul care va fi embedduit dintr-o notiță.
// Acceptă opțional `tagNames: string[]` pentru a fi inclus în embedding.
export function noteToText(note) {
  const parts = [note.title, note.subject, note.chapter].filter(Boolean);
  if (Array.isArray(note.tagNames) && note.tagNames.length > 0) {
    parts.push(`tags: ${note.tagNames.join(', ')}`);
  }
  if (note.content) parts.push(extractTipTapText(note.content));
  // Textul extras din fișierul atașat (PDF/Word/Excel/imagine) — limitat ca să
  // nu domine embedding-ul.
  if (note.extractedFileText) parts.push(note.extractedFileText.slice(0, 3000));
  // Prefixul "passage:" e recomandat de modelul E5 pentru documente
  return `passage: ${parts.join(' ')}`;
}

export function extractTipTapText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) return node.content.map(extractTipTapText).join(' ');
  if (node.content) return extractTipTapText(node.content);
  return '';
}
