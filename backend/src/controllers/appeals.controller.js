import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

// POST /api/auth/ban-appeal — userul banat depune un apel
export async function submitAppeal(req, res, next) {
  try {
    const { message, isPublic } = req.body;
    if (!message?.trim() || message.trim().length < 20) {
      throw new AppError('Mesajul apelului trebuie să aibă cel puțin 20 de caractere', 400);
    }
    if (message.length > 5000) {
      throw new AppError('Mesajul apelului este prea lung (max 5000 caractere)', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, banned: true },
    });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    if (!user.banned) throw new AppError('Doar conturile banate pot depune apel', 403);

    // Nu permite mai mult de un apel activ.
    const activeCount = await prisma.banAppeal.count({
      where: { userId: req.user.id, status: { not: 'RESOLVED' } },
    });
    if (activeCount > 0) {
      throw new AppError('Ai deja un apel deschis. Așteaptă răspunsul adminilor.', 409);
    }

    const appeal = await prisma.banAppeal.create({
      data: {
        userId: req.user.id,
        message: message.trim(),
        status: 'PENDING',
        isPublic: isPublic === true || isPublic === 'true',
      },
      select: {
        id: true, status: true, message: true,
        createdAt: true, isPublic: true,
      },
    });
    res.status(201).json(appeal);
  } catch (err) {
    next(err);
  }
}

// GET /api/appeals/public — listare publică, doar appeals rezolvate cu isPublic=true
// Username-ul e anonimizat (prima literă + ***).
export async function listPublicAppeals(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const where = { isPublic: true, status: 'RESOLVED' };
    const [total, rows] = await Promise.all([
      prisma.banAppeal.count({ where }),
      prisma.banAppeal.findMany({
        where,
        orderBy: { resolvedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, message: true, resolution: true,
          adminResponse: true, createdAt: true, resolvedAt: true,
          user: { select: { username: true, banReason: true } },
        },
      }),
    ]);

    // Anonimizăm username-ul: primele 2 chars + ***
    const items = rows.map(a => ({
      id: a.id,
      message: a.message,
      resolution: a.resolution,
      adminResponse: a.adminResponse,
      banReason: a.user?.banReason || null,
      anonymousUsername: anonymize(a.user?.username),
      createdAt: a.createdAt,
      resolvedAt: a.resolvedAt,
    }));

    res.json({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    next(err);
  }
}

function anonymize(username) {
  if (!username) return 'anon';
  if (username.length <= 2) return username[0] + '***';
  return username.slice(0, 2) + '***';
}

// GET /api/admin/appeals — listare toate (admin)
export async function listAppeals(req, res, next) {
  try {
    const appeals = await prisma.banAppeal.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true, username: true, name: true, email: true, banned: true,
            bannedAt: true, banReason: true,
          },
        },
        openedBy:    { select: { id: true, username: true } },
        resolvedBy:  { select: { id: true, username: true } },
      },
    });
    res.json(appeals);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/appeals/:id — detaliu cu nota/comentariul pentru care a fost banat
export async function getAppeal(req, res, next) {
  try {
    const appeal = await prisma.banAppeal.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true, username: true, name: true, email: true, banned: true,
            bannedAt: true, banReason: true, banNoteId: true, banCommentId: true,
          },
        },
        openedBy:    { select: { id: true, username: true } },
        resolvedBy:  { select: { id: true, username: true } },
      },
    });
    if (!appeal) throw new AppError('Apel inexistent', 404);

    // Aducem nota / comentariul cauză (dacă există)
    let banNote = null;
    let banComment = null;
    if (appeal.user.banNoteId) {
      banNote = await prisma.note.findUnique({
        where: { id: appeal.user.banNoteId },
        select: {
          id: true, title: true, subject: true, gradeLevel: true, type: true,
          content: true, hidden: true, createdAt: true,
          author: { select: { id: true, username: true } },
        },
      });
    }
    if (appeal.user.banCommentId) {
      banComment = await prisma.comment.findUnique({
        where: { id: appeal.user.banCommentId },
        select: {
          id: true, content: true, createdAt: true,
          note: { select: { id: true, title: true } },
        },
      });
    }

    res.json({ ...appeal, banNote, banComment });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/appeals/:id/open — admin preia tichetul
export async function openAppeal(req, res, next) {
  try {
    const appeal = await prisma.banAppeal.findUnique({ where: { id: req.params.id } });
    if (!appeal) throw new AppError('Apel inexistent', 404);
    if (appeal.status === 'RESOLVED') throw new AppError('Apelul a fost deja soluționat', 400);

    const updated = await prisma.banAppeal.update({
      where: { id: req.params.id },
      data: {
        status: 'OPEN',
        openedById: req.user.id,
        openedAt: appeal.openedAt || new Date(),
      },
      include: {
        user: { select: { id: true, username: true } },
        openedBy: { select: { id: true, username: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Apeluri pentru ștergere notiță (autorul cere să fie salvată notița).
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/notes/:id/appeal — autorul depune apel
export async function submitNoteAppeal(req, res, next) {
  try {
    const { message } = req.body;
    if (!message?.trim() || message.trim().length < 20) {
      throw new AppError('Mesajul apelului trebuie să aibă cel puțin 20 de caractere', 400);
    }
    if (message.length > 5000) throw new AppError('Mesajul e prea lung (max 5000)', 400);

    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true, deletionScheduledAt: true, title: true },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    if (note.authorId !== req.user.id) throw new AppError('Doar autorul poate depune apel', 403);
    if (!note.deletionScheduledAt) throw new AppError('Notița nu e programată pentru ștergere', 400);

    const active = await prisma.noteAppeal.count({
      where: { noteId: note.id, status: { not: 'RESOLVED' } },
    });
    if (active > 0) throw new AppError('Există deja un apel deschis pentru această notiță', 409);

    const appeal = await prisma.noteAppeal.create({
      data: { noteId: note.id, userId: req.user.id, message: message.trim(), status: 'PENDING' },
      select: { id: true, status: true, message: true, createdAt: true },
    });
    res.status(201).json(appeal);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/note-appeals — listare (admin)
export async function listNoteAppeals(req, res, next) {
  try {
    const appeals = await prisma.noteAppeal.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, username: true, name: true, email: true } },
        note: {
          select: {
            id: true, title: true, subject: true, gradeLevel: true, hidden: true,
            deletionScheduledAt: true, deletionReason: true,
          },
        },
        openedBy:   { select: { id: true, username: true } },
        resolvedBy: { select: { id: true, username: true } },
      },
    });
    res.json(appeals);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/note-appeals/:id — detaliu cu notița completă
export async function getNoteAppeal(req, res, next) {
  try {
    const appeal = await prisma.noteAppeal.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, username: true, name: true, email: true } },
        note: true,
        openedBy:   { select: { id: true, username: true } },
        resolvedBy: { select: { id: true, username: true } },
      },
    });
    if (!appeal) throw new AppError('Apel inexistent', 404);
    res.json(appeal);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/note-appeals/:id/open
export async function openNoteAppeal(req, res, next) {
  try {
    const appeal = await prisma.noteAppeal.findUnique({ where: { id: req.params.id } });
    if (!appeal) throw new AppError('Apel inexistent', 404);
    if (appeal.status === 'RESOLVED') throw new AppError('Apelul a fost deja soluționat', 400);

    const updated = await prisma.noteAppeal.update({
      where: { id: req.params.id },
      data: {
        status: 'OPEN',
        openedById: req.user.id,
        openedAt: appeal.openedAt || new Date(),
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/note-appeals/:id/resolve  body: { resolution, response }
// OVERTURNED → anulează programarea ștergerii (notița se păstrează, devine vizibilă)
// UPHELD     → ștergerea rămâne programată
export async function resolveNoteAppeal(req, res, next) {
  try {
    const { resolution, response } = req.body;
    if (!['UPHELD', 'OVERTURNED'].includes(resolution)) {
      throw new AppError('Verdict invalid', 400);
    }

    const appeal = await prisma.noteAppeal.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, noteId: true },
    });
    if (!appeal) throw new AppError('Apel inexistent', 404);
    if (appeal.status === 'RESOLVED') throw new AppError('Apelul a fost deja soluționat', 400);

    const updated = await prisma.noteAppeal.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        resolution,
        adminResponse: response?.trim() || null,
        resolvedById: req.user.id,
        resolvedAt: new Date(),
      },
    });

    if (resolution === 'OVERTURNED') {
      await prisma.note.update({
        where: { id: appeal.noteId },
        data: { hidden: false, deletionScheduledAt: null, deletionReason: null },
      });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/appeals/:id/resolve  body: { resolution: 'UPHELD' | 'OVERTURNED', response }
export async function resolveAppeal(req, res, next) {
  try {
    const { resolution, response } = req.body;
    if (!['UPHELD', 'OVERTURNED'].includes(resolution)) {
      throw new AppError('Verdict invalid. Valori acceptate: UPHELD, OVERTURNED', 400);
    }

    const appeal = await prisma.banAppeal.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, userId: true },
    });
    if (!appeal) throw new AppError('Apel inexistent', 404);
    if (appeal.status === 'RESOLVED') throw new AppError('Apelul a fost deja soluționat', 400);

    const updated = await prisma.banAppeal.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        resolution,
        adminResponse: response?.trim() || null,
        resolvedById: req.user.id,
        resolvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, username: true } },
        resolvedBy: { select: { id: true, username: true } },
      },
    });

    // Dacă verdictul e OVERTURNED → ridicăm banul (păstrăm fields pentru istoric).
    if (resolution === 'OVERTURNED') {
      await prisma.user.update({
        where: { id: appeal.userId },
        data: { banned: false },
      });
      // Marchează ultimul BanRecord deschis ca ridicat prin apel.
      const lastOpen = await prisma.banRecord.findFirst({
        where: { userId: appeal.userId, liftedAt: null },
        orderBy: { bannedAt: 'desc' },
      });
      if (lastOpen) {
        await prisma.banRecord.update({
          where: { id: lastOpen.id },
          data: { liftedAt: new Date(), liftedById: req.user.id, liftReason: 'APPEAL_OVERTURNED' },
        });
      }
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
