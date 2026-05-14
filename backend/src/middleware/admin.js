const ADMIN_ROLES = new Set(['ADMIN', 'HEAD_ADMIN']);

export function requireAdmin(req, res, next) {
  if (!ADMIN_ROLES.has(req.user?.role)) {
    return res.status(403).json({ error: 'Acces interzis' });
  }
  next();
}

export function requireHeadAdmin(req, res, next) {
  if (req.user?.role !== 'HEAD_ADMIN') {
    return res.status(403).json({ error: 'Acces rezervat head admin' });
  }
  next();
}
