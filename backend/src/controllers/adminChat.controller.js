import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

const MESSAGE_LIMIT = 100;

// GET /api/admin/chat?after=<id>
export async function getMessages(req, res, next) {
  try {
    const { after } = req.query;

    const where = after ? { createdAt: { gt: (await prisma.adminMessage.findUnique({ where: { id: after }, select: { createdAt: true } }))?.createdAt } } : {};

    const messages = await prisma.adminMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_LIMIT,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, username: true, role: true } },
      },
    });

    res.json(messages);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/chat
export async function sendMessage(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim()) throw new AppError('Mesajul nu poate fi gol', 400);
    if (content.trim().length > 1000) throw new AppError('Mesajul este prea lung (max 1000 caractere)', 400);

    const message = await prisma.adminMessage.create({
      data: {
        content: content.trim(),
        authorId: req.user.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, username: true, role: true } },
      },
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/chat/:id  (șterge propriul mesaj sau orice mesaj dacă ești HEAD_ADMIN)
export async function deleteMessage(req, res, next) {
  try {
    const msg = await prisma.adminMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) throw new AppError('Mesaj inexistent', 404);

    if (msg.authorId !== req.user.id && req.user.role !== 'HEAD_ADMIN') {
      throw new AppError('Nu poți șterge mesajele altora', 403);
    }

    await prisma.adminMessage.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
