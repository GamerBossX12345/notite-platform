import { prisma } from '../db/prismaClient.js';

export async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acces interzis' });
    }
    next();
  } catch (err) {
    next(err);
  }
}
