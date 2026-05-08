import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

// POST /api/notes/:id/ratings
export async function create(req, res, next) {
  try {
    const value = Number(req.body.value);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new AppError('Rating invalid — trebuie să fie între 1 și 5', 400);
    }

    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    if (note.authorId === req.user.id) throw new AppError('Nu poți vota propria notiță', 403);

    await prisma.rating.upsert({
      where: { userId_noteId: { userId: req.user.id, noteId: note.id } },
      create: { userId: req.user.id, noteId: note.id, value },
      update: { value },
    });

    const agg = await prisma.rating.aggregate({
      where: { noteId: note.id },
      _avg: { value: true },
      _count: { value: true },
    });

    const updated = await prisma.note.update({
      where: { id: note.id },
      data: {
        avgRating: agg._avg.value ?? 0,
        ratingCount: agg._count.value,
      },
    });

    res.json({ avgRating: updated.avgRating, ratingCount: updated.ratingCount });
  } catch (err) {
    next(err);
  }
}
