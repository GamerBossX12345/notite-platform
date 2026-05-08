import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

// GET /api/notes/:id/comments
export async function list(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const comments = await prisma.comment.findMany({
      where: { noteId: req.params.id, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    res.json(comments);
  } catch (err) {
    next(err);
  }
}

// POST /api/notes/:id/comments
export async function create(req, res, next) {
  try {
    const { content, parentId } = req.body;
    if (!content?.trim()) throw new AppError('Comentariul nu poate fi gol', 400);

    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.noteId !== note.id) {
        throw new AppError('Comentariu părinte invalid', 400);
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: req.user.id,
        noteId: note.id,
        parentId: parentId ?? null,
      },
      include: { user: { select: { id: true, username: true } } },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}
