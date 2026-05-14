import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { moderateReport } from '../services/moderation.service.js';
import { ensureNoteFileText } from '../services/documentText.service.js';

const VALID_REASONS = ['PLAGIAT', 'CONTINUT_NEPOTRIVIT', 'SPAM', 'ALTUL'];

// POST /api/notes/:id/reports
export async function create(req, res, next) {
  try {
    const { reason, details } = req.body;
    if (!VALID_REASONS.includes(reason)) throw new AppError('Motiv invalid', 400);

    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, subject: true, content: true, fileUrl: true, extractedFileText: true },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const hasTextContent = note.content && JSON.stringify(note.content).length > 10;
    // Acum AI-ul poate "citi" și fișierele atașate (PDF/Word/Excel/imagine).
    const fileText = await ensureNoteFileText(note);
    const hasAnyText = hasTextContent || (fileText && fileText.length > 10);

    let aiResult = null;
    let noteHidden = false;

    if (!hasAnyText) {
      // Chiar și acum, dacă nu s-a putut extrage NIMIC (tip de fișier neacceptat
      // sau extragere eșuată), ascundem automat — nu putem verifica.
      await prisma.note.update({ where: { id: note.id }, data: { hidden: true } });
      noteHidden = true;
    } else {
      const noteContent = typeof note.content === 'string'
        ? note.content
        : JSON.stringify(note.content || '');

      aiResult = await moderateReport({
        noteTitle: note.title,
        noteContent,
        noteSubject: note.subject,
        fileText,
        reason,
        details,
      });

      if (aiResult?.verdict === 'VALID') {
        await prisma.note.update({ where: { id: note.id }, data: { hidden: true } });
        noteHidden = true;
      }
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user?.id ?? null,
        noteId: note.id,
        reason,
        details: details?.trim() || null,
        aiVerdict: !hasAnyText ? 'VALID' : (aiResult?.verdict ?? null),
        aiVerdictText: !hasAnyText
          ? 'Ascunsă automat: conținutul notiței nu a putut fi extras pentru verificare.'
          : (aiResult?.text ?? null),
      },
    });

    res.status(201).json({
      id: report.id,
      aiVerdict: report.aiVerdict,
      aiVerdictText: report.aiVerdictText,
      noteHidden,
    });
  } catch (err) {
    next(err);
  }
}
