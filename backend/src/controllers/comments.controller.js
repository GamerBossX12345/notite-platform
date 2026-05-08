import { AppError } from '../middleware/errorHandler.js';
import { validateRequest, CreateCommentSchema } from '../middleware/validators.js';
import * as commentsService from '../services/comments.service.js';
import { prisma } from '../db/prismaClient.js';

// GET /api/notes/:id/comments
// Listare comentarii cu threading (top-level + replies)
export async function list(req, res, next) {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) throw new AppError('Notiță inexistentă', 404);

    const comments = await commentsService.getComments(req.params.id);
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

// POST /api/notes/:id/comments
// Creare comentariu sau reply (dacă se transmite parentId)
export async function create(req, res, next) {
  try {
    const validated = validateRequest(CreateCommentSchema, req.body);

    const comment = await commentsService.createComment(
      req.user.id,
      req.params.id,
      validated.content,
      validated.parentId || null
    );

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notes/:id/comments/:commentId
// Șterge comentariu (doar autor)
export async function deleteComment(req, res, next) {
  try {
    await commentsService.deleteComment(req.params.commentId, req.user.id);
    res.json({ message: 'Comentariu șters' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/notes/:id/comments/:commentId
// Editare comentariu (doar autor)
export async function updateComment(req, res, next) {
  try {
    const validated = validateRequest(CreateCommentSchema, req.body);

    const comment = await commentsService.updateComment(
      req.params.commentId,
      validated.content,
      req.user.id
    );

    res.json(comment);
  } catch (err) {
    next(err);
  }
}
