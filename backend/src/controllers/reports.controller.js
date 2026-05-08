import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { moderateReport } from '../services/moderation.service.js';

const VALID_REASONS = ['PLAGIAT', 'CONTINUT_NEPOTRIVIT', 'SPAM', 'ALTUL'];

// POST /api/notes/:id/reports
export async function create(req, res, next) {
  try {
    const { reason, details } = req.body;
    if (!VALID_REASONS.includes(reason)) throw new AppError('Motiv invalid', 400);

    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, subject: true, content: true },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    // Extrage text din content (JSON TipTap sau string)
    const noteContent = typeof note.content === 'string'
      ? note.content
      : JSON.stringify(note.content || '');

    // Verificare AI — rulăm async, nu blocăm dacă eșuează
    const aiResult = await moderateReport({
      noteTitle: note.title,
      noteContent,
      noteSubject: note.subject,
      reason,
      details,
    });

    // Dacă AI consideră raportul valid, ascunde nota automat
    if (aiResult?.verdict === 'VALID') {
      await prisma.note.update({
        where: { id: note.id },
        data: { hidden: true },
      });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        noteId: note.id,
        reason,
        details: details?.trim() || null,
        aiVerdict: aiResult?.verdict ?? null,
        aiVerdictText: aiResult?.text ?? null,
      },
    });

    res.status(201).json({
      id: report.id,
      aiVerdict: report.aiVerdict,
      aiVerdictText: report.aiVerdictText,
      noteHidden: aiResult?.verdict === 'VALID',
    });
  } catch (err) {
    next(err);
  }
}
