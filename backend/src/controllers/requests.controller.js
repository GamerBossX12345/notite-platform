// Sistem de cereri — un user cere o notiță care lipsește, alții o împlinesc.
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_STATUS = ['OPEN', 'FULFILLED', 'CLOSED'];

// GET /api/requests — listare publică, paginat, cu filtre.
//   ?status=OPEN|FULFILLED|CLOSED  (default OPEN)
//   ?subject=...  ?gradeLevel=...  ?mine=1 (doar ale userului curent)
export async function list(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const status   = VALID_STATUS.includes(req.query.status) ? req.query.status : 'OPEN';

    const where = { status };
    if (req.query.subject)    where.subject = req.query.subject;
    if (req.query.gradeLevel) where.gradeLevel = Number(req.query.gradeLevel);
    if ((req.query.mine === '1' || req.query.mine === 'true') && req.user) {
      where.userId = req.user.id;
    }

    const [total, requests] = await Promise.all([
      prisma.noteRequest.count({ where }),
      prisma.noteRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user:          { select: { id: true, username: true, name: true, showName: true } },
          fulfilledBy:   { select: { id: true, username: true } },
          fulfilledNote: { select: { id: true, title: true, subject: true, gradeLevel: true } },
        },
      }),
    ]);

    res.json({ requests, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    next(err);
  }
}

// GET /api/requests/:id — detaliu
export async function getById(req, res, next) {
  try {
    const request = await prisma.noteRequest.findUnique({
      where: { id: req.params.id },
      include: {
        user:          { select: { id: true, username: true, name: true, showName: true } },
        fulfilledBy:   { select: { id: true, username: true } },
        fulfilledNote: { select: { id: true, title: true, subject: true, gradeLevel: true, type: true } },
      },
    });
    if (!request) throw new AppError('Cerere inexistentă', 404);
    res.json(request);
  } catch (err) {
    next(err);
  }
}

// POST /api/requests — creează o cerere (auth + nebanat)
export async function create(req, res, next) {
  try {
    const { title, description, subject, gradeLevel } = req.body;
    if (!title?.trim() || title.trim().length < 8) {
      throw new AppError('Titlul cererii trebuie să aibă cel puțin 8 caractere', 400);
    }
    if (title.length > 200) throw new AppError('Titlul este prea lung (max 200 caractere)', 400);
    if (description && description.length > 2000) {
      throw new AppError('Descrierea este prea lungă (max 2000 caractere)', 400);
    }

    let grade = null;
    if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
      const n = Number(gradeLevel);
      if (!Number.isInteger(n) || n < 5 || n > 12) {
        throw new AppError('Clasa trebuie să fie între 5 și 12', 400);
      }
      grade = n;
    }

    const created = await prisma.noteRequest.create({
      data: {
        userId: req.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        subject: subject?.trim() || null,
        gradeLevel: grade,
      },
      include: {
        user: { select: { id: true, username: true, name: true, showName: true } },
      },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

// POST /api/requests/:id/fulfill — { noteId } — orice user nebanat poate împlini
// o cerere deschisă legând o notiță existentă (vizibilă, nu ascunsă).
export async function fulfill(req, res, next) {
  try {
    const { noteId } = req.body;
    if (!noteId) throw new AppError('noteId obligatoriu', 400);

    const request = await prisma.noteRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new AppError('Cerere inexistentă', 404);
    if (request.status !== 'OPEN') throw new AppError('Cererea nu mai este deschisă', 409);

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { id: true, hidden: true },
    });
    if (!note) throw new AppError('Notița aleasă nu există', 404);
    if (note.hidden) throw new AppError('Notița aleasă nu este disponibilă', 400);

    const updated = await prisma.noteRequest.update({
      where: { id: request.id },
      data: {
        status: 'FULFILLED',
        fulfilledNoteId: note.id,
        fulfilledById: req.user.id,
        fulfilledAt: new Date(),
      },
      include: {
        user:          { select: { id: true, username: true, name: true, showName: true } },
        fulfilledBy:   { select: { id: true, username: true } },
        fulfilledNote: { select: { id: true, title: true, subject: true, gradeLevel: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/requests/:id/close — autorul sau un admin închide cererea
export async function close(req, res, next) {
  try {
    const request = await prisma.noteRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new AppError('Cerere inexistentă', 404);

    const isOwner = request.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'HEAD_ADMIN';
    if (!isOwner && !isAdmin) throw new AppError('Nu ai voie să închizi această cerere', 403);
    if (request.status === 'FULFILLED') throw new AppError('Cererea e deja împlinită', 409);

    const updated = await prisma.noteRequest.update({
      where: { id: request.id },
      data: { status: 'CLOSED' },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/requests/:id/reopen — autorul sau admin redeschide o cerere închisă
export async function reopen(req, res, next) {
  try {
    const request = await prisma.noteRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new AppError('Cerere inexistentă', 404);

    const isOwner = request.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'HEAD_ADMIN';
    if (!isOwner && !isAdmin) throw new AppError('Nu ai voie să redeschizi această cerere', 403);
    if (request.status !== 'CLOSED') throw new AppError('Doar cererile închise pot fi redeschise', 409);

    const updated = await prisma.noteRequest.update({
      where: { id: request.id },
      data: { status: 'OPEN' },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/requests/:id — autorul sau admin șterge cererea
export async function remove(req, res, next) {
  try {
    const request = await prisma.noteRequest.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });
    if (!request) throw new AppError('Cerere inexistentă', 404);

    const isOwner = request.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'HEAD_ADMIN';
    if (!isOwner && !isAdmin) throw new AppError('Nu ai voie să ștergi această cerere', 403);

    await prisma.noteRequest.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
