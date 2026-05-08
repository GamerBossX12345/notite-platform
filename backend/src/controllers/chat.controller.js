// AI Chat controller — POST /api/notes/:id/chat
import { AppError } from '../middleware/errorHandler.js';
import { chatAboutNote } from '../services/chat.service.js';
import { prisma } from '../db/prismaClient.js';

export async function chat(req, res, next) {
  try {
    const { message, history } = req.body;

    if (!message?.trim()) throw new AppError('Mesajul nu poate fi gol', 400);
    if (message.length > 2000) throw new AppError('Mesajul este prea lung (max 2000 caractere)', 400);

    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      select: { title: true, content: true, subject: true },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const noteContent = typeof note.content === 'string'
      ? note.content
      : JSON.stringify(note.content || '');

    const reply = await chatAboutNote({
      noteTitle: note.title,
      noteContent,
      noteSubject: note.subject,
      history: Array.isArray(history) ? history : [],
      userMessage: message.trim(),
    });

    res.json({ reply });
  } catch (err) {
    next(err);
  }
}
