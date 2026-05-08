// Controller pentru notițe.
// Pentru skeleton, logica e direct aici. Când crește, mut-o în services/notes.service.js
// (același pattern ca auth.service.js).

import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_TYPES = ['REZUMAT', 'EXERCITII', 'FISA', 'HARTA_CONCEPTUALA'];

// GET /api/notes
// Listare cu filtre, căutare, sortare și paginare. Public.
export async function list(req, res, next) {
  try {
    const {
      subject, gradeLevel, type, author, q,
      sort = 'recent', page = '1', pageSize = '12',
    } = req.query;

    const where = {};
    if (subject) where.subject = subject;
    if (gradeLevel) where.gradeLevel = Number(gradeLevel);
    if (type && VALID_TYPES.includes(type)) where.type = type;
    if (author) where.author = { username: author };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      sort === 'popular' ? { viewCount: 'desc' } :
      sort === 'rating'  ? { avgRating: 'desc' } :
      { createdAt: 'desc' };

    const pageNum     = Math.max(1, Number(page));
    const pageSizeNum = Math.min(50, Math.max(1, Number(pageSize)));

    const [notes, total] = await prisma.$transaction([
      prisma.note.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy,
        include: { author: { select: { id: true, username: true } } },
      }),
      prisma.note.count({ where }),
    ]);

    res.json({
      notes,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum) || 1,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/:id
// Detaliu notiță. Public.
export async function getById(req, res, next) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, username: true } },
        // TODO: include comments cu user-ul lor
      },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    // TODO: incrementează viewCount.
    // Atenție:
    //   - nu mări dacă e autorul (req.user?.id === note.authorId)
    //   - nu mări de mai multe ori în aceeași sesiune (poți pune un Set în memorie sau
    //     verifica IP+noteId într-un tabel View dacă vrei rigoare)

    res.json(note);
  } catch (err) {
    next(err);
  }
}

// POST /api/notes
// Creare notiță. Acceptă multipart/form-data (câmpuri text + fișier opțional).
export async function create(req, res, next) {
  try {
    const { title, subject, gradeLevel, chapter, type } = req.body;

    // `content` vine ca JSON string din FormData; poate lipsi dacă nota e doar fișier.
    let content = null;
    if (req.body.content) {
      try { content = JSON.parse(req.body.content); } catch { content = null; }
    }

    if (!title || !subject || !gradeLevel || !type) {
      throw new AppError('Câmpurile titlu, materie, clasă și tip sunt obligatorii.', 400);
    }
    if (!VALID_TYPES.includes(type)) {
      throw new AppError('Tip de notiță invalid.', 400);
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const note = await prisma.note.create({
      data: {
        title,
        subject,
        gradeLevel: Number(gradeLevel),
        chapter: chapter || null,
        type,
        content,
        fileUrl,
        authorId: req.user.id,
      },
    });
    res.status(201).json(note);
  } catch (err) {
    // Dacă notița nu a putut fi creată, șterge fișierul urcat (dacă există).
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
}

// PUT /api/notes/:id
// Actualizare notiță. Doar autorul. Câmpuri permise: title, chapter, content.
export async function update(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    if (note.authorId !== req.user.id) throw new AppError('Nu ai voie să modifici', 403);

    const { title, chapter, content } = req.body;
    const updated = await prisma.note.update({
      where: { id: note.id },
      data: {
        ...(title !== undefined && { title }),
        ...(chapter !== undefined && { chapter: chapter || null }),
        ...(content !== undefined && { content }),
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notes/:id
// Ștergere notiță. Doar autorul.
export async function remove(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    if (note.authorId !== req.user.id) throw new AppError('Nu ai voie să ștergi', 403);

    if (note.fileUrl) {
      const filePath = path.join('uploads', path.basename(note.fileUrl));
      fs.unlink(filePath, () => {}); // ignoră erori (fișierul poate fi deja absent)
    }

    await prisma.note.delete({ where: { id: note.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
