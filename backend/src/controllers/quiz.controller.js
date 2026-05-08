// Quiz generator controller
import { AppError } from '../middleware/errorHandler.js';
import { generateQuiz } from '../services/quiz.service.js';
import { prisma } from '../db/prismaClient.js';

// GET /api/notes/:id/quiz
// Generează 5 întrebări pe baza conținutului notei folosind Claude AI
export async function generate(req, res, next) {
  try {
    const noteId = req.params.id;

    // Găsește nota
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { title: true, content: true, subject: true },
    });

    if (!note) {
      throw new AppError('Notiță inexistentă', 404);
    }

    if (!note.content) {
      throw new AppError('Notiță goală — nu pot genera quiz fără conținut', 400);
    }

    // Apelează serviciul de quiz
    const quiz = await generateQuiz(note.content, note.title, note.subject);

    res.json(quiz);
  } catch (err) {
    next(err);
  }
}
