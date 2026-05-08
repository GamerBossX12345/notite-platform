// Rating service — votare cu actualizare transacțională a avgRating și ratingCount.
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

export async function createRating(userId, noteId, value) {
  // Verifică că nota există
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) {
    throw new AppError('Nota nu există', 404);
  }

  // Tranzacție: INSERT/UPDATE rating + UPDATE note.avgRating/ratingCount
  const result = await prisma.$transaction(async (tx) => {
    // Încearcă update dacă voting-ul deja există
    const existing = await tx.rating.findUnique({
      where: { userId_noteId: { userId, noteId } },
    });

    let rating;
    if (existing) {
      // Update votul existent
      rating = await tx.rating.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      // Creează nou vot
      rating = await tx.rating.create({
        data: { userId, noteId, value },
      });
    }

    // Recalculează statistici
    const stats = await tx.rating.aggregate({
      where: { noteId },
      _avg: { value: true },
      _count: true,
    });

    // Actualizează nota
    await tx.note.update({
      where: { id: noteId },
      data: {
        avgRating: stats._avg.value || 0,
        ratingCount: stats._count,
      },
    });

    return rating;
  });

  return result;
}

export async function deleteRating(userId, noteId) {
  const rating = await prisma.rating.findUnique({
    where: { userId_noteId: { userId, noteId } },
  });

  if (!rating) {
    throw new AppError('Votul nu există', 404);
  }

  // Tranzacție: DELETE rating + UPDATE note
  await prisma.$transaction(async (tx) => {
    await tx.rating.delete({ where: { id: rating.id } });

    const stats = await tx.rating.aggregate({
      where: { noteId },
      _avg: { value: true },
      _count: true,
    });

    await tx.note.update({
      where: { id: noteId },
      data: {
        avgRating: stats._avg.value || 0,
        ratingCount: stats._count,
      },
    });
  });
}

export async function getUserRating(userId, noteId) {
  return prisma.rating.findUnique({
    where: { userId_noteId: { userId, noteId } },
  });
}
