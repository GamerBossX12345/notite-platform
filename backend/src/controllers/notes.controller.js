import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateRequest, CreateNoteSchema, UpdateNoteSchema, DuplicateCheckSchema } from '../middleware/validators.js';
import { fingerprintText, compareFingerprints } from '../services/shingling.service.js';

const VALID_TYPES = ['REZUMAT', 'EXERCITII', 'FISA', 'HARTA_CONCEPTUALA'];

// GET /api/notes
// Listare cu filtre, căutare, sortare și paginare. Public.
export async function list(req, res, next) {
  try {
    const {
      subject, gradeLevel, type, author, q,
      sort = 'recent', page = '1', pageSize = '12',
    } = req.query;

    const where = { hidden: false };
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
        comments: {
          where: { parentId: null },
          include: {
            user: { select: { id: true, username: true } },
            replies: {
              include: { user: { select: { id: true, username: true } } },
            },
          },
        },
      },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    // Notițe ascunse: vizibile doar pentru autor
    if (note.hidden && req.user?.id !== note.authorId) {
      throw new AppError('Această notiță a fost ascunsă temporar în urma unui raport.', 403);
    }

    // Incrementează viewCount (dacă nu e autorul)
    if (req.user?.id !== note.authorId) {
      await prisma.note.update({
        where: { id: req.params.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    res.json(note);
  } catch (err) {
    next(err);
  }
}

// POST /api/notes
// Creare notiță. Acceptă multipart/form-data (câmpuri text + fișier opțional).
export async function create(req, res, next) {
  try {
    const validated = validateRequest(CreateNoteSchema, req.body);

    // `content` vine ca JSON string din FormData; poate lipsi dacă nota e doar fișier.
    let content = null;
    if (req.body.content) {
      try { content = JSON.parse(req.body.content); } catch { content = null; }
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Generează fingerprint pentru duplicate detection
    const textContent = typeof content === 'string' ? content : JSON.stringify(content || '');
    const contentHash = fingerprintText(textContent);

    const note = await prisma.note.create({
      data: {
        title: validated.title,
        subject: validated.subject,
        gradeLevel: validated.gradeLevel,
        chapter: validated.chapter || null,
        type: validated.type,
        content,
        fileUrl,
        contentHash,
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
    const validated = validateRequest(UpdateNoteSchema, req.body);

    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    if (note.authorId !== req.user.id) throw new AppError('Nu ai voie să modifici', 403);

    const data = {};
    if (validated.title !== undefined) data.title = validated.title;
    if (validated.chapter !== undefined) data.chapter = validated.chapter || null;
    if (validated.content !== undefined) data.content = validated.content;
    if (validated.subject !== undefined) data.subject = validated.subject;
    if (validated.gradeLevel !== undefined) data.gradeLevel = validated.gradeLevel;
    if (validated.type !== undefined) data.type = validated.type;

    // Dacă se actualizează content, regenerează fingerprint
    if (data.content !== undefined) {
      const textContent = typeof data.content === 'string' ? data.content : JSON.stringify(data.content || '');
      data.contentHash = fingerprintText(textContent);
    }

    const updated = await prisma.note.update({
      where: { id: note.id },
      data,
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
