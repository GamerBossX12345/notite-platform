// Audit log — listare. Două endpoint-uri:
//   1) Userul îl poate vedea pe al lui (din profil) — vede acțiunile aplicate ASUPRA lui.
//   2) Head admin poate vedea totul.
import { prisma } from '../db/prismaClient.js';

// GET /api/admin/audit-log — head admin
export async function listAll(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
    const targetUserId = req.query.targetUserId || undefined;
    const action       = req.query.action || undefined;

    const where = {};
    if (targetUserId) where.targetUserId = targetUserId;
    if (action)       where.action = action;

    const [total, entries] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor:      { select: { id: true, username: true, role: true } },
          targetUser: { select: { id: true, username: true } },
        },
      }),
    ]);

    res.json({ entries, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me/audit-log — userul curent își vede istoria
export async function listMine(req, res, next) {
  try {
    const entries = await prisma.auditLog.findMany({
      where: { targetUserId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      // Nu expunem cine a fost actorul — doar acțiunea și detaliile.
      // Userul are dreptul să vadă ce s-a întâmplat cu contul lui, nu să afle
      // identitatea adminului care a făcut acțiunea.
      select: {
        id: true, action: true, details: true, createdAt: true,
      },
    });
    res.json(entries);
  } catch (err) {
    next(err);
  }
}
