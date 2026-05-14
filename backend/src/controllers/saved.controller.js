// Bookmark/saved notes — un user marchează notițe pentru revedere.
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

// POST /api/notes/:id/save — toggle implicit (idempotent dacă există deja).
export async function save(req, res, next) {
  try {
    const noteId = req.params.id;
    const note = await prisma.note.findUnique({ where: { id: noteId }, select: { id: true } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    await prisma.savedNote.upsert({
      where: { userId_noteId: { userId: req.user.id, noteId } },
      update: {},
      create: { userId: req.user.id, noteId },
    });
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notes/:id/save
export async function unsave(req, res, next) {
  try {
    await prisma.savedNote.deleteMany({
      where: { userId: req.user.id, noteId: req.params.id },
    });
    res.json({ saved: false });
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/:id/save — { saved: boolean } pentru o singură notiță
export async function getStatus(req, res, next) {
  try {
    const row = await prisma.savedNote.findUnique({
      where: { userId_noteId: { userId: req.user.id, noteId: req.params.id } },
      select: { id: true },
    });
    res.json({ saved: !!row });
  } catch (err) {
    next(err);
  }
}

// GET /api/me/saved — toate notițele salvate de userul curent, paginat
export async function listMine(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 24));

    const [total, rows] = await Promise.all([
      prisma.savedNote.count({ where: { userId: req.user.id } }),
      prisma.savedNote.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          note: {
            select: {
              id: true, title: true, subject: true, gradeLevel: true, type: true,
              avgRating: true, ratingCount: true, viewCount: true, createdAt: true,
              hidden: true,
              author: { select: { username: true, name: true, showName: true } },
            },
          },
        },
      }),
    ]);

    // Filtrăm notițele ascunse (raportate / șterse).
    const notes = rows
      .filter(r => r.note && !r.note.hidden)
      .map(r => ({ ...r.note, savedAt: r.createdAt }));

    res.json({
      notes,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    next(err);
  }
}
