// Comments service — manage comments cu threading (parentId pentru replies).
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

export async function createComment(userId, noteId, content, parentId = null) {
  // Verifică că nota există
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) {
    throw new AppError('Nota nu există', 404);
  }

  // Dacă e reply (parentId), verifică că parent-ul există și e pe aceeași notiță
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
    });
    if (!parentComment || parentComment.noteId !== noteId) {
      throw new AppError('Comentariu parent nu există', 404);
    }
  }

  const comment = await prisma.comment.create({
    data: {
      userId,
      noteId,
      content,
      parentId: parentId || null,
    },
    include: {
      user: { select: { id: true, username: true } },
      replies: {
        include: {
          user: { select: { id: true, username: true } },
        },
      },
    },
  });

  return comment;
}

export async function getComments(noteId) {
  // Doar comentariile top-level (parentId = null)
  return prisma.comment.findMany({
    where: { noteId, parentId: null },
    include: {
      user: { select: { id: true, username: true } },
      replies: {
        include: {
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteComment(commentId, userId) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw new AppError('Comentariu nu există', 404);
  }

  // Doar autorrul poate șterge
  if (comment.userId !== userId) {
    throw new AppError('Nu ai permisiunea să ștergi acest comentariu', 403);
  }

  // Șterge comentariu (reply-urile vor rămâne orfane, sau se pot capta de parent-ul lor)
  // Prisma va șterge automat reply-urile datorită onDelete: Cascade din schema
  return prisma.comment.delete({ where: { id: commentId } });
}

export async function updateComment(commentId, content, userId) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw new AppError('Comentariu nu există', 404);
  }

  if (comment.userId !== userId) {
    throw new AppError('Nu ai permisiunea să editezi acest comentariu', 403);
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: {
      user: { select: { id: true, username: true } },
    },
  });
}
