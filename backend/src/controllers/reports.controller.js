import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_REASONS = ['PLAGIAT', 'CONTINUT_NEPOTRIVIT', 'SPAM', 'ALTUL'];

// POST /api/notes/:id/reports
export async function create(req, res, next) {
  try {
    const { reason, details } = req.body;
    if (!VALID_REASONS.includes(reason)) throw new AppError('Motiv invalid', 400);

    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        noteId: note.id,
        reason,
        details: details?.trim() || null,
      },
    });

    res.status(201).json({ id: report.id });
  } catch (err) {
    next(err);
  }
}
