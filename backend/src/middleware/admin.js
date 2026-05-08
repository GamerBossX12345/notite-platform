// requireAdmin trebuie pus DUPĂ requireAuth în lanțul de middleware.
// Verifică că utilizatorul autentificat are username-ul 'Admin'.
export function requireAdmin(req, res, next) {
  if (req.user?.username !== 'Admin') {
    return res.status(403).json({ error: 'Acces interzis — doar Admin.' });
  }
  next();
}
