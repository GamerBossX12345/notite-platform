import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_TYPES = ['REZUMAT', 'EXERCITII', 'FISA', 'HARTA_CONCEPTUALA'];

// ── Utilizatori ──────────────────────────────────────────────────────────────

// GET /api/admin/users
export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        school: true,
        grade: true,
        reputation: true,
        createdAt: true,
        _count: { select: { notes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id
export async function updateUser(req, res, next) {
  try {
    const { name, email, username, school, grade } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name     !== undefined && { name: name?.trim() || null }),
        ...(email    !== undefined && { email }),
        ...(username !== undefined && { username }),
        ...(school   !== undefined && { school: school?.trim() || null }),
        ...(grade    !== undefined && { grade: grade ? Number(grade) : null }),
      },
      select: {
        id: true, email: true, username: true, name: true,
        school: true, grade: true, reputation: true, createdAt: true,
        _count: { select: { notes: true, comments: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:id
export async function deleteUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    if (user.username === 'Admin') throw new AppError('Contul Admin nu poate fi șters', 403);

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ── Notițe ───────────────────────────────────────────────────────────────────

// GET /api/admin/notes
export async function listNotes(req, res, next) {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, username: true, name: true } } },
    });
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/notes/:id
export async function updateNote(req, res, next) {
  try {
    const { title, subject, gradeLevel, type, chapter } = req.body;

    if (type !== undefined && !VALID_TYPES.includes(type)) {
      throw new AppError('Tip de notiță invalid', 400);
    }

    const updated = await prisma.note.update({
      where: { id: req.params.id },
      data: {
        ...(title      !== undefined && { title }),
        ...(subject    !== undefined && { subject }),
        ...(gradeLevel !== undefined && { gradeLevel: Number(gradeLevel) }),
        ...(type       !== undefined && { type }),
        ...(chapter    !== undefined && { chapter: chapter || null }),
      },
      include: { author: { select: { id: true, username: true, name: true } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/notes/:id
export async function deleteNote(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    if (note.fileUrl) {
      const filePath = path.join('uploads', path.basename(note.fileUrl));
      fs.unlink(filePath, () => {});
    }

    await prisma.note.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
