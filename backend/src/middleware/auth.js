// Middleware de autentificare.
// Pus pe rute, verifică tokenul JWT din header-ul Authorization.
// Dacă tokenul e valid, atașează `req.user = { id }` și cheamă next().
// Dacă nu, răspunde 401 și oprește lanțul.
//
// Folosire în router:
//   router.post('/notes', requireAuth, notesController.create);

import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token lipsă' });
  }

  const token = authHeader.slice(7); // scoate prefixul "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.userId, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid sau expirat' });
  }
}
