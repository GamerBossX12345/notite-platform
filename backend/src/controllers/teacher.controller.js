// Verificare profesor. Patru căi:
//   1) EMAIL_DOMAIN — auto la register pentru .edu, .gov.ro, .ac.uk etc.
//   2) INVITE_CODE  — head admin generează coduri, userul le introduce în Setări.
//   3) DOCUMENT     — userul depune o cerere cu upload de diplomă/legitimație;
//                     head admin aprobă sau respinge.
//   4) MANUAL       — head admin setează direct flag-ul din panou.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';

// Domenii care primesc auto-verificare. Lista poate fi extinsă oricând.
const TEACHER_EMAIL_PATTERNS = [
  /@[a-z0-9-]+\.edu$/i,
  /@[a-z0-9-]+\.edu\.[a-z]{2,3}$/i,        // .edu.ro, .edu.us
  /@[a-z0-9-]+\.ac\.[a-z]{2,3}$/i,         // .ac.uk
  /@[a-z0-9-]+\.gov\.ro$/i,                // Ministerul Educației
];

export function emailQualifiesForTeacher(email) {
  if (!email) return false;
  return TEACHER_EMAIL_PATTERNS.some(p => p.test(email));
}

// POST /api/auth/teacher-request — userul logat depune o cerere.
// Acceptă multipart/form-data ca să poată atașa o dovadă (diplomă/legitimație).
export async function submitRequest(req, res, next) {
  try {
    const { message } = req.body;
    if (!message?.trim() || message.trim().length < 30) {
      if (req.file) fs.unlink(req.file.path, () => {});
      throw new AppError('Mesajul trebuie să aibă cel puțin 30 de caractere (descrie școala, materia, etc.)', 400);
    }
    if (message.length > 3000) {
      if (req.file) fs.unlink(req.file.path, () => {});
      throw new AppError('Mesajul este prea lung (max 3000 caractere)', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, isTeacher: true },
    });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    if (user.isTeacher) {
      if (req.file) fs.unlink(req.file.path, () => {});
      throw new AppError('Ești deja profesor verificat', 409);
    }

    const existing = await prisma.teacherRequest.findFirst({
      where: { userId: req.user.id, status: 'PENDING' },
    });
    if (existing) {
      if (req.file) fs.unlink(req.file.path, () => {});
      throw new AppError('Ai deja o cerere în așteptare', 409);
    }

    const documentUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const created = await prisma.teacherRequest.create({
      data: {
        userId: req.user.id,
        message: message.trim(),
        documentUrl,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
}

// GET /api/auth/teacher-request/me — vezi propria cerere (cea mai recentă)
export async function getMyRequest(req, res, next) {
  try {
    const r = await prisma.teacherRequest.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(r);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/teacher-requests — head admin listează cererile
export async function listRequests(req, res, next) {
  try {
    const status = req.query.status || undefined;
    const where = status ? { status } : {};
    const requests = await prisma.teacherRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        user:        { select: { id: true, username: true, email: true, name: true, school: true, isTeacher: true } },
        reviewedBy:  { select: { id: true, username: true } },
      },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/teacher-requests/:id/approve
export async function approve(req, res, next) {
  try {
    const { adminResponse } = req.body;
    const reqRow = await prisma.teacherRequest.findUnique({ where: { id: req.params.id } });
    if (!reqRow) throw new AppError('Cerere inexistentă', 404);
    if (reqRow.status !== 'PENDING') throw new AppError('Cererea a fost deja procesată', 409);

    const [updatedReq] = await prisma.$transaction([
      prisma.teacherRequest.update({
        where: { id: reqRow.id },
        data: {
          status: 'APPROVED',
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          adminResponse: adminResponse?.trim() || null,
        },
      }),
      prisma.user.update({
        where: { id: reqRow.userId },
        data: {
          isTeacher: true,
          teacherVerifiedAt: new Date(),
          teacherVerificationMethod: 'DOCUMENT',
        },
      }),
    ]);
    logAudit({ targetUserId: reqRow.userId, actorId: req.user.id, action: 'TEACHER_APPROVE', details: { requestId: reqRow.id } });
    res.json(updatedReq);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/teacher-requests/:id/reject
export async function reject(req, res, next) {
  try {
    const { adminResponse } = req.body;
    const reqRow = await prisma.teacherRequest.findUnique({ where: { id: req.params.id } });
    if (!reqRow) throw new AppError('Cerere inexistentă', 404);
    if (reqRow.status !== 'PENDING') throw new AppError('Cererea a fost deja procesată', 409);

    const updated = await prisma.teacherRequest.update({
      where: { id: reqRow.id },
      data: {
        status: 'REJECTED',
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        adminResponse: adminResponse?.trim() || null,
      },
    });
    logAudit({ targetUserId: reqRow.userId, actorId: req.user.id, action: 'TEACHER_REJECT', details: { requestId: reqRow.id } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/teacher — head admin setează manual statusul
export async function setTeacherManual(req, res, next) {
  try {
    const { isTeacher } = req.body;
    if (typeof isTeacher !== 'boolean') throw new AppError('isTeacher boolean obligatoriu', 400);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isTeacher,
        teacherVerifiedAt: isTeacher ? new Date() : null,
        teacherVerificationMethod: isTeacher ? 'MANUAL' : null,
      },
      select: { id: true, username: true, isTeacher: true, teacherVerifiedAt: true },
    });
    logAudit({
      targetUserId: updated.id,
      actorId: req.user.id,
      action: isTeacher ? 'TEACHER_SET' : 'TEACHER_UNSET',
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ── Invite codes ─────────────────────────────────────────────────────────────

// Cod prietenos: 12 caractere uppercase din alfabet fără confuzie vizuală.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(length = 12) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}
function normalizeCode(raw) {
  return String(raw || '').replace(/[\s-]/g, '').toUpperCase();
}

// POST /api/admin/teacher-invite-codes — head admin generează cod
export async function createInviteCode(req, res, next) {
  try {
    const { note, maxUses, expiresAt } = req.body;
    const maxUsesNum = maxUses ? Math.max(1, Math.min(1000, Number(maxUses))) : 1;
    let expDate = null;
    if (expiresAt) {
      expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime())) throw new AppError('Dată de expirare invalidă', 400);
    }

    // Foarte rar (1 / 32^12) putem da peste un cod existent — încercăm de câteva ori.
    let code = null;
    for (let i = 0; i < 5; i++) {
      const candidate = generateCode(12);
      const exists = await prisma.teacherInviteCode.findUnique({ where: { code: candidate } });
      if (!exists) { code = candidate; break; }
    }
    if (!code) throw new AppError('Nu am putut genera un cod unic. Încearcă din nou.', 500);

    const created = await prisma.teacherInviteCode.create({
      data: {
        code,
        note: note?.trim() || null,
        maxUses: maxUsesNum,
        expiresAt: expDate,
        createdById: req.user.id,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/teacher-invite-codes
export async function listInviteCodes(req, res, next) {
  try {
    const codes = await prisma.teacherInviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy:   { select: { id: true, username: true } },
        redemptions: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json(codes);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/teacher-invite-codes/:id — revocă (soft delete: setează revokedAt)
export async function revokeInviteCode(req, res, next) {
  try {
    const code = await prisma.teacherInviteCode.findUnique({ where: { id: req.params.id } });
    if (!code) throw new AppError('Cod inexistent', 404);
    if (code.revokedAt) throw new AppError('Codul e deja revocat', 409);
    const updated = await prisma.teacherInviteCode.update({
      where: { id: code.id },
      data: { revokedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/teacher-invite/redeem — user folosește un cod
export async function redeemInviteCode(req, res, next) {
  try {
    const code = normalizeCode(req.body.code);
    if (!code || code.length < 4) throw new AppError('Cod invalid', 400);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, isTeacher: true },
    });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    if (user.isTeacher) throw new AppError('Ești deja profesor verificat', 409);

    const row = await prisma.teacherInviteCode.findUnique({ where: { code } });
    if (!row) throw new AppError('Cod inexistent', 404);
    if (row.revokedAt) throw new AppError('Cod revocat', 410);
    if (row.expiresAt && row.expiresAt < new Date()) throw new AppError('Cod expirat', 410);
    if (row.usedCount >= row.maxUses) throw new AppError('Codul a atins numărul maxim de utilizări', 410);

    // Tranzacție: înregistrăm redemption, incrementăm usedCount, marcăm userul profesor.
    try {
      await prisma.$transaction([
        prisma.teacherInviteCodeRedemption.create({
          data: { codeId: row.id, userId: req.user.id },
        }),
        prisma.teacherInviteCode.update({
          where: { id: row.id },
          data: { usedCount: { increment: 1 } },
        }),
        prisma.user.update({
          where: { id: req.user.id },
          data: {
            isTeacher: true,
            teacherVerifiedAt: new Date(),
            teacherVerificationMethod: 'INVITE_CODE',
          },
        }),
      ]);
    } catch (err) {
      // Unique constraint pe (codeId, userId) — userul a folosit deja codul.
      if (err.code === 'P2002') throw new AppError('Ai folosit deja acest cod', 409);
      throw err;
    }

    logAudit({
      targetUserId: req.user.id,
      actorId: req.user.id,
      action: 'TEACHER_INVITE_REDEEM',
      details: { codeId: row.id },
    });

    res.json({ ok: true, isTeacher: true });
  } catch (err) {
    next(err);
  }
}

// ── Note validations ─────────────────────────────────────────────────────────

// POST /api/notes/:id/validate — profesor marchează notița ca CORRECT sau INCORRECT
export async function validateNote(req, res, next) {
  try {
    const { verdict, comment } = req.body;
    if (verdict !== 'CORRECT' && verdict !== 'INCORRECT') {
      throw new AppError('Verdict invalid', 400);
    }
    if (comment && comment.length > 1000) {
      throw new AppError('Comentariu prea lung (max 1000 caractere)', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isTeacher: true },
    });
    if (!user?.isTeacher) throw new AppError('Doar profesorii verificați pot evalua notițele', 403);

    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true },
    });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    if (note.authorId === req.user.id) {
      throw new AppError('Nu poți evalua propria notiță', 409);
    }

    const upserted = await prisma.noteValidation.upsert({
      where: { noteId_teacherId: { noteId: note.id, teacherId: req.user.id } },
      create: {
        noteId: note.id,
        teacherId: req.user.id,
        verdict,
        comment: comment?.trim() || null,
      },
      update: { verdict, comment: comment?.trim() || null },
      include: { teacher: { select: { id: true, username: true } } },
    });
    res.json(upserted);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notes/:id/validate — profesorul își retrage validarea
export async function removeValidation(req, res, next) {
  try {
    const existing = await prisma.noteValidation.findUnique({
      where: { noteId_teacherId: { noteId: req.params.id, teacherId: req.user.id } },
    });
    if (!existing) throw new AppError('Nu ai validare pe această notiță', 404);
    await prisma.noteValidation.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/:id/validations — listare publică pentru afișare pe pagina notei
export async function listValidations(req, res, next) {
  try {
    const items = await prisma.noteValidation.findMany({
      where: { noteId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { teacher: { select: { id: true, username: true, isTeacher: true } } },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
}
