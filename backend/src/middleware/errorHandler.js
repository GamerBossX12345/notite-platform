// Centralized error handler.
// Trebuie pus ULTIMUL în lanțul de middleware (după toate route-urile).
//
// Cum funcționează: în orice controller, când chemi `next(err)` sau arunci
// o eroare într-o funcție async pe care o prinzi cu try/catch + next(err),
// Express trece controlul aici. Așa scapi de copy-paste de res.status(500)
// în fiecare endpoint.

export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err);

  // Erorile noastre custom (au statusCode setat).
  if (err.statusCode) {
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.extra) Object.assign(body, err.extra);
    return res.status(err.statusCode).json(body);
  }

  // Prisma: violare unique constraint (ex: email deja folosit).
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] ?? 'câmp';
    return res.status(409).json({ error: `${field} deja folosit` });
  }

  // Prisma: record nu există (ex: update pe id inexistent).
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resursă inexistentă' });
  }

  // Default — eroare neașteptată.
  res.status(500).json({ error: 'Eroare internă server' });
}

// Helper pentru aruncat erori cu status code.
// Folosește: throw new AppError('Mesaj', 400);
export class AppError extends Error {
  constructor(message, statusCode = 400, { code, extra } = {}) {
    super(message);
    this.statusCode = statusCode;
    if (code) this.code = code;
    if (extra) this.extra = extra;
  }
}
