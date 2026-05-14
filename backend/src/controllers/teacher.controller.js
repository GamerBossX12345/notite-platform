// Verificare profesor. Două căi:
//   1) Auto: email cu domeniu școlar (.edu, .edu.ro, etc.) — setat la register.
//   2) Manual: userul completează un form în Setări → TeacherRequest → head admin aprobă.
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

// POST /api/auth/teacher-request — userul logat depune o cerere
export async function submitRequest(req, res, next) {
  try {
    const { message } = req.body;
    if (!message?.trim() || message.trim().length < 30) {
      throw new AppError('Mesajul trebuie să aibă cel puțin 30 de caractere (descrie școala, materia, etc.)', 400);
    }
    if (message.length > 3000) {
      throw new AppError('Mesajul este prea lung (max 3000 caractere)', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, isTeacher: true },
    });
    if (!user) throw new AppError('Utilizator inexistent', 404);
    if (user.isTeacher) throw new AppError('Ești deja profesor verificat', 409);

    const existing = await prisma.teacherRequest.findFirst({
      where: { userId: req.user.id, status: 'PENDING' },
    });
    if (existing) throw new AppError('Ai deja o cerere în așteptare', 409);

    const created = await prisma.teacherRequest.create({
      data: { userId: req.user.id, message: message.trim() },
    });
    res.status(201).json(created);
  } catch (err) {
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
        data: { isTeacher: true, teacherVerifiedAt: new Date() },
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
