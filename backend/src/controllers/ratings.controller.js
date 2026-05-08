import { AppError } from '../middleware/errorHandler.js';
import { validateRequest, CreateRatingSchema } from '../middleware/validators.js';
import * as ratingsService from '../services/ratings.service.js';
import { prisma } from '../db/prismaClient.js';

// POST /api/notes/:id/ratings
// Crează sau actualizează rating (1-5 stars)
export async function create(req, res, next) {
  try {
    const validated = validateRequest(CreateRatingSchema, req.body);

    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);
    if (note.authorId === req.user.id) throw new AppError('Nu poți vota propria notiță', 403);

    const rating = await ratingsService.createRating(req.user.id, req.params.id, validated.value);

    res.json({ message: 'Rating salvat', rating });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notes/:id/ratings
// Șterge votul utilizatorului pentru nota respectivă
export async function deleteRating(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    await ratingsService.deleteRating(req.user.id, req.params.id);

    res.json({ message: 'Rating șters' });
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/:id/rating (vot curent al utilizatorului)
export async function getUserRating(req, res, next) {
  try {
    const rating = await ratingsService.getUserRating(req.user.id, req.params.id);
    res.json(rating || { value: null });
  } catch (err) {
    next(err);
  }
}
