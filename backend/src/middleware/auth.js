import jwt from 'jsonwebtoken';
import { prisma } from '../db/prismaClient.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token lipsă' });
    }

    const token = authHeader.slice(7);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token invalid sau expirat' });
    }

    // Verifică că utilizatorul există și nu este suspendat
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, suspendedUntil: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Token invalid' });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const until = new Date(user.suspendedUntil).toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      return res.status(403).json({
        error: `Contul tău este suspendat până la ${until}.`,
        suspendedUntil: user.suspendedUntil,
      });
    }

    req.user = { id: payload.userId, username: payload.username };
    next();
  } catch (err) {
    next(err);
  }
}
