import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';

const VALID_TYPES = ['REZUMAT', 'EXERCITII', 'FISA', 'HARTA_CONCEPTUALA', 'FORMULE'];

// ── Utilizatori ──────────────────────────────────────────────────────────────

const ROLE_ORDER = { HEAD_ADMIN: 0, ADMIN: 1, USER: 2 };

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
        role: true,
        isTeacher: true,
        teacherVerifiedAt: true,
        reputation: true,
        suspendedUntil: true,
        createdAt: true,
        _count: { select: { notes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    users.sort((a, b) => (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2));
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/set-role  (doar HEAD_ADMIN)
export async function setRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['ADMIN', 'USER'].includes(role)) throw new AppError('Rol invalid. Valorile acceptate: ADMIN, USER', 400);

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('Utilizator inexistent', 404);
    if (target.role === 'HEAD_ADMIN') throw new AppError('Rolul head admin nu poate fi modificat', 403);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, username: true, role: true },
    });
    logAudit({ targetUserId: updated.id, actorId: req.user.id, action: 'ROLE_CHANGE', details: { newRole: role, previousRole: target.role } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/suspend
export async function suspendUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    if (user.role === 'ADMIN' || user.role === 'HEAD_ADMIN') throw new AppError('Un cont de admin nu poate fi suspendat', 403);

    const hours = Number(req.body?.hours) || 48;
    const suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { suspendedUntil },
      select: { id: true, username: true, suspendedUntil: true },
    });
    logAudit({ targetUserId: updated.id, actorId: req.user.id, action: 'SUSPEND', details: { hours, until: suspendedUntil } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/warn
export async function warnUser(req, res, next) {
  try {
    const { message } = req.body;
    if (!message?.trim()) throw new AppError('Mesajul avertismentului nu poate fi gol', 400);

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('Utilizator inexistent', 404);
    if (target.role === 'HEAD_ADMIN') throw new AppError('Nu poți avertiza head admin', 403);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { warning: message.trim() },
      select: { id: true, username: true, warning: true },
    });
    logAudit({ targetUserId: updated.id, actorId: req.user.id, action: 'WARN', details: { message: message.trim() } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/ban
// Banează contul. Va fi șters automat după N zile dacă nu există apel activ.
export async function banUser(req, res, next) {
  try {
    const { reason, noteId, commentId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    if (user.role === 'HEAD_ADMIN') throw new AppError('Head admin nu poate fi banat', 403);
    if (user.role === 'ADMIN' && req.user.role !== 'HEAD_ADMIN') {
      throw new AppError('Doar head admin poate bana un cont de admin', 403);
    }

    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        banned: true,
        bannedAt: now,
        banReason: reason?.trim() || null,
        banNoteId: noteId || null,
        banCommentId: commentId || null,
        banCount: { increment: 1 },
      },
      select: { id: true, username: true, banned: true, bannedAt: true, banCount: true },
    });

    // Jurnal permanent — se salvează automat cine a primit ban, de cine și de ce.
    await prisma.banRecord.create({
      data: {
        userId: req.params.id,
        reason: reason?.trim() || null,
        noteId: noteId || null,
        commentId: commentId || null,
        bannedById: req.user.id,
        bannedAt: now,
      },
    });

    logAudit({ targetUserId: updated.id, actorId: req.user.id, action: 'BAN', details: { reason: reason?.trim() || null, noteId: noteId || null, commentId: commentId || null } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/unban — ridică banul (păstrează contul ȘI istoricul)
// Câmpurile banReason/banNoteId/banCommentId/bannedAt rămân populate ca istoric,
// vizibile pe pagina /ban-history a utilizatorului.
export async function unbanUser(req, res, next) {
  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { banned: false },
      select: { id: true, username: true, banned: true },
    });

    // Marchează ultimul BanRecord deschis ca ridicat.
    const lastOpen = await prisma.banRecord.findFirst({
      where: { userId: req.params.id, liftedAt: null },
      orderBy: { bannedAt: 'desc' },
    });
    if (lastOpen) {
      await prisma.banRecord.update({
        where: { id: lastOpen.id },
        data: { liftedAt: new Date(), liftedById: req.user.id, liftReason: 'ADMIN_UNBAN' },
      });
    }

    logAudit({ targetUserId: updated.id, actorId: req.user.id, action: 'UNBAN' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/unsuspend
export async function unsuspendUser(req, res, next) {
  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { suspendedUntil: null },
      select: { id: true, username: true, suspendedUntil: true },
    });
    logAudit({ targetUserId: updated.id, actorId: req.user.id, action: 'UNSUSPEND' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id
export async function updateUser(req, res, next) {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
    if (!target) throw new AppError('Utilizator inexistent', 404);
    if (target.role === 'HEAD_ADMIN') throw new AppError('Contul head admin nu poate fi modificat', 403);

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
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('Utilizator inexistent', 404);

    // HEAD_ADMIN nu poate fi șters de nimeni
    if (target.role === 'HEAD_ADMIN') {
      throw new AppError('Contul head admin nu poate fi șters', 403);
    }

    // Conturile ADMIN pot fi șterse numai de HEAD_ADMIN
    if (target.role === 'ADMIN' && req.user.role !== 'HEAD_ADMIN') {
      throw new AppError('Doar head admin poate șterge un cont de admin', 403);
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/server/restart  (head admin only)
// Repornește procesul Node. Dacă rulează sub nodemon/pm2/docker, supervizorul
// îl va reporni automat. În dezvoltare (nodemon), echivalentul lui `rs` în cmd.
export async function restartServer(req, res, next) {
  try {
    if (req.user.role !== 'HEAD_ADMIN') throw new AppError('Acces rezervat head admin', 403);
    console.log(`[ServerRestart] requested by head admin ${req.user.username}`);
    res.json({ ok: true, message: 'Server restart inițiat...' });
    // Lăsăm răspunsul să plece înainte de a ucide procesul.
    setTimeout(() => process.exit(0), 200);
  } catch (err) {
    next(err);
  }
}

// ── Raportări ────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['PENDING', 'REVIEWED', 'RESOLVED'];

// GET /api/admin/reports
export async function listReports(req, res, next) {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true, name: true } },
        note: {
          select: {
            id: true,
            title: true,
            hidden: true,
            author: { select: { id: true, username: true, suspendedUntil: true } },
          },
        },
      },
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/reports/:id
export async function updateReport(req, res, next) {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) throw new AppError('Status invalid', 400);

    // Atribuim adminul care actionează raportul (când iese din PENDING).
    const actioning = status !== 'PENDING';
    const updated = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(actioning ? { actionedById: req.user.id, actionedAt: new Date() } : {}),
      },
      include: {
        reporter: { select: { id: true, username: true, name: true } },
        note: { select: { id: true, title: true, hidden: true, author: { select: { id: true, username: true, suspendedUntil: true } } } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/reports/:id
export async function deleteReport(req, res, next) {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
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

// POST /api/admin/notes/:id/unhide
export async function unhideNote(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    await prisma.note.update({
      where: { id: req.params.id },
      data: { hidden: false, deletionScheduledAt: null, deletionReason: null },
    });
    res.json({ id: req.params.id, hidden: false });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/notes/:id/schedule-deletion  body: { days, reason }
// Marchează notița ca ascunsă acum și o programează pentru ștergere efectivă
// după N zile. Autorul poate depune apel pentru a o salva.
export async function scheduleNoteDeletion(req, res, next) {
  try {
    const days = parseInt(req.body.days, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      throw new AppError('Numărul de zile trebuie să fie între 1 și 365', 400);
    }
    const reason = (req.body.reason || '').toString().trim();
    if (!reason) throw new AppError('Motivul este obligatoriu', 400);

    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const scheduledAt = new Date(Date.now() + days * 86400000);
    const updated = await prisma.note.update({
      where: { id: req.params.id },
      data: {
        hidden: true,
        deletionScheduledAt: scheduledAt,
        deletionReason: reason,
      },
      select: {
        id: true, title: true, hidden: true,
        deletionScheduledAt: true, deletionReason: true,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/notes/:id/cancel-deletion — revocă programarea (face notița vizibilă)
export async function cancelNoteDeletion(req, res, next) {
  try {
    const updated = await prisma.note.update({
      where: { id: req.params.id },
      data: { hidden: false, deletionScheduledAt: null, deletionReason: null },
      select: { id: true, hidden: true, deletionScheduledAt: true },
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
