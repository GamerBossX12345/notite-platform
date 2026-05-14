// Extragere text din fișierele atașate notițelor, pentru ca AI-ul (chat / quiz /
// flashcards / moderare) să "vadă" și conținutul documentelor, nu doar textul TipTap.
//
//   PDF        → pdf-parse
//   Word .docx → mammoth
//   Excel      → xlsx (sheetjs)
//   Imagini    → model vision Groq (OCR + descriere)
//   PPT / ODT  → momentan neacceptate (returnează gol, fără eroare)
//
// Textul extras se cache-uiește în Note.extractedFileText ca să nu reprocesăm.
import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prismaClient.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Model multimodal Groq — configurabil. Llama 4 Scout e multimodal și rapid.
const VISION_MODEL = process.env.VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const MAX_EXTRACTED_CHARS = 12000; // limită ca să nu umflăm DB-ul / contextul AI

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const IMAGE_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif',  '.webp': 'image/webp',
};

// Calea absolută pe disc pornind de la fileUrl (/uploads/xxx.ext).
function diskPath(fileUrl) {
  return path.join('uploads', path.basename(fileUrl));
}

function clamp(text) {
  if (!text) return '';
  const clean = text.replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
  return clean.length > MAX_EXTRACTED_CHARS
    ? clean.slice(0, MAX_EXTRACTED_CHARS) + '\n…[text trunchiat]'
    : clean;
}

// ── Extractoare per tip ──────────────────────────────────────────────────────

async function extractPdf(absPath) {
  const { PDFParse } = await import('pdf-parse');
  const buffer = fs.readFileSync(absPath);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result?.text || '';
  } finally {
    await parser.destroy?.();
  }
}

async function extractDocx(absPath) {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.extractRawText({ path: absPath });
  return result?.value || '';
}

async function extractXlsx(absPath) {
  const XLSX = (await import('xlsx')).default;
  const wb = XLSX.readFile(absPath);
  const parts = [];
  for (const sheetName of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
    if (csv.trim()) parts.push(`# Foaie: ${sheetName}\n${csv}`);
  }
  return parts.join('\n\n');
}

async function extractImage(absPath, ext) {
  const apiKey = process.env.CHATBOT_API_KEY;
  if (!apiKey) {
    console.warn('[documentText] CHATBOT_API_KEY lipsă — sar peste OCR imagine');
    return '';
  }
  const buffer = fs.readFileSync(absPath);
  const base64 = buffer.toString('base64');
  const mime = IMAGE_MIME[ext] || 'image/jpeg';

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Aceasta este o imagine atașată unei notițe educaționale. '
              + 'Transcrie TOT textul vizibil (inclusiv scris de mână, formule, diagrame) '
              + 'și descrie pe scurt conținutul educațional. Răspunde în română, doar conținutul, fără introduceri.',
          },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      }],
      max_tokens: 1500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    console.error('[documentText] vision API error:', response.status, await response.text().catch(() => ''));
    return '';
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ── API public ───────────────────────────────────────────────────────────────

// Extrage textul brut dintr-un fișier atașat. Întoarce '' dacă tipul nu e
// acceptat sau dacă extragerea eșuează (niciodată nu aruncă).
export async function extractFileText(fileUrl) {
  if (!fileUrl) return '';
  const absPath = diskPath(fileUrl);
  if (!fs.existsSync(absPath)) return '';

  const ext = path.extname(absPath).toLowerCase();
  try {
    if (ext === '.pdf')                       return clamp(await extractPdf(absPath));
    if (ext === '.docx')                      return clamp(await extractDocx(absPath));
    if (ext === '.xlsx' || ext === '.xls')    return clamp(await extractXlsx(absPath));
    if (IMAGE_EXTS.has(ext))                  return clamp(await extractImage(absPath, ext));
    // .doc, .ppt, .pptx, .odt — neacceptate deocamdată
    return '';
  } catch (err) {
    console.error(`[documentText] extragere eșuată pentru ${fileUrl}:`, err.message);
    return '';
  }
}

// Extrage și salvează în DB pentru o notiță. Apelat asincron (setImmediate) după
// upload/update. Idempotent — suprascrie valoarea existentă.
export async function extractAndStoreForNote(noteId) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { id: true, fileUrl: true },
    });
    if (!note) return;
    if (!note.fileUrl) {
      await prisma.note.update({ where: { id: noteId }, data: { extractedFileText: null } });
      return;
    }
    const text = await extractFileText(note.fileUrl);
    await prisma.note.update({
      where: { id: noteId },
      data: { extractedFileText: text || null },
    });
  } catch (err) {
    console.error(`[documentText] store eșuat pentru ${noteId}:`, err.message);
  }
}

// Lazy: întoarce textul fișierului pentru o notiță. Dacă nu e încă extras (notițe
// vechi, dinainte de feature), îl extrage acum, îl salvează și îl întoarce.
// `note` trebuie să conțină { id, fileUrl, extractedFileText }.
export async function ensureNoteFileText(note) {
  if (!note) return '';
  if (note.extractedFileText != null) return note.extractedFileText;
  if (!note.fileUrl) return '';
  const text = await extractFileText(note.fileUrl);
  // Cache pentru data viitoare (best-effort).
  prisma.note.update({
    where: { id: note.id },
    data: { extractedFileText: text || null },
  }).catch(() => {});
  return text;
}
