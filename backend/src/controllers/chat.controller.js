// AI Chat controller — conversație persistată per utilizator + per notiță.
//   GET    /api/notes/:id/chat  → istoricul conversației
//   POST   /api/notes/:id/chat  → trimite mesaj, primește + salvează răspunsul
//   DELETE /api/notes/:id/chat  → șterge conversația
import { AppError } from '../middleware/errorHandler.js';
import { chatAboutNote } from '../services/chat.service.js';
import { ensureNoteFileText } from '../services/documentText.service.js';
import { prisma } from '../db/prismaClient.js';

// Câte mesaje din istoric trimitem ca context la AI. Limită ca să nu explodeze
// token usage-ul (rate limit-ul de 5/oră oferă protecție suplimentară).
const HISTORY_CONTEXT_LIMIT = 20;

// GET /api/notes/:id/chat — istoricul conversației userului curent pe această notiță.
export async function getHistory(req, res, next) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: req.user.id, noteId: req.params.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

// POST /api/notes/:id/chat — { message }
export async function chat(req, res, next) {
  try {
    const { message } = req.body;

    if (!message?.trim()) throw new AppError('Mesajul nu poate fi gol', 400);
    if (message.length > 2000) throw new AppError('Mesajul este prea lung (max 2000 caractere)', 400);

    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, content: true, subject: true, fileUrl: true, extractedFileText: true },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const noteContent = typeof note.content === 'string'
      ? note.content
      : JSON.stringify(note.content || '');

    const fileText = await ensureNoteFileText(note);

    // Istoricul vine din DB (nu de la client) — sursa de adevăr e serverul.
    const past = await prisma.chatMessage.findMany({
      where: { userId: req.user.id, noteId: note.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_CONTEXT_LIMIT,
      select: { role: true, content: true },
    });
    const history = past.reverse(); // cronologic

    const reply = await chatAboutNote({
      noteTitle: note.title,
      noteContent,
      noteSubject: note.subject,
      fileText,
      history,
      userMessage: message.trim(),
    });

    // Persistăm ambele mesaje (întrebarea userului + răspunsul AI).
    await prisma.chatMessage.createMany({
      data: [
        { userId: req.user.id, noteId: note.id, role: 'user',      content: message.trim() },
        { userId: req.user.id, noteId: note.id, role: 'assistant', content: reply },
      ],
    });

    res.json({ reply });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notes/:id/chat — șterge conversația userului pe această notiță.
export async function clearHistory(req, res, next) {
  try {
    await prisma.chatMessage.deleteMany({
      where: { userId: req.user.id, noteId: req.params.id },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
