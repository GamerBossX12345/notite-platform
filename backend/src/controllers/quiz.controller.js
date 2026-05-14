// Quiz generator controller
import { AppError } from '../middleware/errorHandler.js';
import { generateQuiz } from '../services/quiz.service.js';
import { extractTipTapText } from '../services/embedding.service.js';
import { ensureNoteFileText } from '../services/documentText.service.js';
import { prisma } from '../db/prismaClient.js';

// GET /api/notes/:id/quiz
// Generează 5 întrebări pe baza conținutului notei folosind Claude AI
export async function generate(req, res, next) {
  try {
    const noteId = req.params.id;

    // Găsește nota
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { id: true, title: true, content: true, subject: true, fileUrl: true, extractedFileText: true },
    });

    if (!note) {
      throw new AppError('Notiță inexistentă', 404);
    }

    // Conținutul e JSON TipTap — extragem textul plat înainte de a-l trimite la AI
    const contentText = note.content
      ? (typeof note.content === 'string' ? note.content : extractTipTapText(note.content))
      : '';

    // Textul fișierului atașat — quiz-ul poate fi generat și doar din fișier.
    const fileText = await ensureNoteFileText(note);

    const combined = [contentText.trim(), fileText.trim()].filter(Boolean).join('\n\n');
    if (!combined) {
      throw new AppError('Notiță goală — nu pot genera quiz fără conținut', 400);
    }

    const quiz = await generateQuiz(combined, note.title, note.subject);

    res.json(quiz);
  } catch (err) {
    next(err);
  }
}
