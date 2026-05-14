// Tag-uri pe notițe. Strategie hibridă:
//   - Tag-uri "oficiale" (isOfficial=true) — definite de head admin, apar primele
//     în autocomplete și au prioritate la sortare.
//   - Tag-uri "user" (isOfficial=false) — create automat de useri la upload.
// Toate numele sunt normalizate lowercase ca să evităm duplicate ("BAC" = "bac").
import { prisma } from '../db/prismaClient.js';
import { AppError } from '../middleware/errorHandler.js';

export function normalizeTagName(name) {
  return name?.toString().trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 32) || null;
}

// GET /api/tags — listare publică, cu query opțional pentru autocomplete.
// Oficial-le ies primele, sortate alfabetic; apoi user-tags.
export async function list(req, res, next) {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));

    const where = q ? { name: { contains: q } } : {};
    const tags = await prisma.tag.findMany({
      where,
      orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
      take: limit,
      select: {
        id: true, name: true, isOfficial: true,
        _count: { select: { notes: true } },
      },
    });
    res.json(tags.map(t => ({ ...t, noteCount: t._count.notes, _count: undefined })));
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/tags — head admin marchează un tag ca oficial (sau îl creează).
export async function createOfficial(req, res, next) {
  try {
    const name = normalizeTagName(req.body.name);
    if (!name) throw new AppError('Numele tag-ului este obligatoriu', 400);

    const tag = await prisma.tag.upsert({
      where: { name },
      update: { isOfficial: true },
      create: { name, isOfficial: true },
    });
    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/tags/:id — head admin șterge un tag (cascade pe NoteTag).
export async function remove(req, res, next) {
  try {
    await prisma.tag.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/tags/:id — toggle isOfficial.
export async function update(req, res, next) {
  try {
    const { isOfficial } = req.body;
    if (typeof isOfficial !== 'boolean') throw new AppError('isOfficial boolean obligatoriu', 400);
    const tag = await prisma.tag.update({
      where: { id: req.params.id },
      data: { isOfficial },
    });
    res.json(tag);
  } catch (err) {
    next(err);
  }
}

// Helper folosit din notes.controller: dat fiind un array de stringuri/IDs,
// returnează ID-urile tag-urilor existente sau create. Nu aruncă pe duplicate.
export async function resolveTagIds(rawNames) {
  if (!Array.isArray(rawNames) || rawNames.length === 0) return [];
  const seen = new Set();
  const names = [];
  for (const r of rawNames) {
    const n = normalizeTagName(r);
    if (n && !seen.has(n)) { seen.add(n); names.push(n); }
  }
  if (names.length === 0) return [];

  // Upsert fiecare tag — paralel.
  const tags = await Promise.all(names.map(name =>
    prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, isOfficial: false },
      select: { id: true },
    })
  ));
  return tags.map(t => t.id);
}
