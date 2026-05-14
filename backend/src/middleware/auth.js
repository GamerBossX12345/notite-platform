import jwt from 'jsonwebtoken';
import { prisma } from '../db/prismaClient.js';

// Folosit DUPĂ requireAuth — blochează utilizatorii cu cont banat,
// astfel încât să nu poată posta notițe / comentarii / etc.
// Endpointurile care trebuie să fie accesibile când ești banat (/auth/me,
// /auth/ban-appeal) NU folosesc acest middleware.
export function requireNotBanned(req, res, next) {
  if (req.user?.banned) {
    return res.status(403).json({
      error: 'Contul tău este banat. Poți depune un apel din pagina /banned.',
      banned: true,
    });
  }
  next();
}

// La fel ca requireAuth, dar NU blochează dacă tokenul lipsește sau e invalid —
// doar populează req.user când există. Pentru endpoint-uri publice care își
// schimbă comportamentul dacă userul e logat (ex: filtrul "doar ale mele").
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(); // token invalid → tratăm ca neautentificat
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, banned: true },
    });
    if (user) {
      req.user = { id: user.id, username: payload.username, role: user.role, banned: user.banned };
    }
    next();
  } catch {
    next();
  }
}

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
      select: { id: true, role: true, suspendedUntil: true, banned: true },
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

    req.user = { id: payload.userId, username: payload.username, role: user.role, banned: user.banned };
    next();
  } catch (err) {
    next(err);
  }
}
