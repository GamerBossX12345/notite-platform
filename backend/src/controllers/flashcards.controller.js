// Flashcards controller — generare AI, listare, review SM-2, delete.
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateFlashcards, applySM2 } from '../services/flashcards.service.js';
import { extractTipTapText } from '../services/embedding.service.js';
import { ensureNoteFileText } from '../services/documentText.service.js';

// POST /api/notes/:id/flashcards/generate — extrage cu AI și salvează pentru user.
export async function generate(req, res, next) {
  try {
    const noteId = req.params.id;
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { id: true, title: true, content: true, subject: true, fileUrl: true, extractedFileText: true },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const contentText = note.content
      ? (typeof note.content === 'string' ? note.content : extractTipTapText(note.content))
      : '';
    const fileText = await ensureNoteFileText(note);

    const text = [contentText.trim(), fileText.trim()].filter(Boolean).join('\n\n');
    if (!text) throw new AppError('Notiță goală — nu pot genera flashcards', 400);

    const { cards } = await generateFlashcards(text, note.title, note.subject);

    // Salvăm fiecare card pentru userul curent.
    const created = await prisma.$transaction(
      cards.map(c => prisma.flashcard.create({
        data: {
          userId: req.user.id,
          noteId,
          front: c.front,
          back: c.back,
        },
      }))
    );

    res.status(201).json({ count: created.length, cards: created });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me/flashcards — toate cardurile mele cu filtru opțional.
//   ?due=1 → doar cele scadente (dueDate <= now)
//   ?noteId=... → doar pentru o notiță specifică
export async function listMine(req, res, next) {
  try {
    const where = { userId: req.user.id };
    if (req.query.due === '1' || req.query.due === 'true') {
      where.dueDate = { lte: new Date() };
    }
    if (req.query.noteId) where.noteId = req.query.noteId;

    const cards = await prisma.flashcard.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: { note: { select: { id: true, title: true, subject: true } } },
    });
    res.json(cards);
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me/flashcards/stats — overview pentru pagina principală.
export async function stats(req, res, next) {
  try {
    const userId = req.user.id;
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [total, due, dueToday, byNote] = await Promise.all([
      prisma.flashcard.count({ where: { userId } }),
      prisma.flashcard.count({ where: { userId, dueDate: { lte: now } } }),
      prisma.flashcard.count({ where: { userId, dueDate: { lte: tomorrow } } }),
      prisma.flashcard.groupBy({
        by: ['noteId'],
        where: { userId, noteId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    // Hidratăm titlurile notițelor.
    const noteIds = byNote.map(b => b.noteId).filter(Boolean);
    const notes = await prisma.note.findMany({
      where: { id: { in: noteIds } },
      select: { id: true, title: true, subject: true },
    });
    const noteById = Object.fromEntries(notes.map(n => [n.id, n]));
    const deckSummary = byNote.map(b => ({
      noteId: b.noteId,
      count: b._count._all,
      note: noteById[b.noteId] || null,
    })).filter(d => d.note);

    res.json({ total, due, dueToday, decks: deckSummary });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/me/flashcards/:id/review — { rating: 2|3|4|5 }
export async function review(req, res, next) {
  try {
    const { rating } = req.body;
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 0 || r > 5) {
      throw new AppError('Rating invalid (trebuie 0-5)', 400);
    }

    const card = await prisma.flashcard.findUnique({ where: { id: req.params.id } });
    if (!card) throw new AppError('Flashcard inexistent', 404);
    if (card.userId !== req.user.id) throw new AppError('Nu ai voie să faci review pe acest card', 403);

    const next_ = applySM2(card, r);
    const updated = await prisma.flashcard.update({
      where: { id: card.id },
      data: next_,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/auth/me/flashcards/:id
export async function remove(req, res, next) {
  try {
    const card = await prisma.flashcard.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!card) throw new AppError('Flashcard inexistent', 404);
    if (card.userId !== req.user.id) throw new AppError('Nu ai voie să ștergi', 403);
    await prisma.flashcard.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// DELETE /api/auth/me/flashcards?noteId=... — șterge toate cardurile pentru o notiță
export async function removeDeck(req, res, next) {
  try {
    const { noteId } = req.query;
    if (!noteId) throw new AppError('noteId obligatoriu', 400);
    const result = await prisma.flashcard.deleteMany({
      where: { userId: req.user.id, noteId },
    });
    res.json({ count: result.count });
  } catch (err) {
    next(err);
  }
}
