import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as notesController from '../controllers/notes.controller.js';
import * as ratingsController from '../controllers/ratings.controller.js';
import * as commentsController from '../controllers/comments.controller.js';
import * as reportsController from '../controllers/reports.controller.js';
import * as duplicatesController from '../controllers/duplicates.controller.js';
import * as quizController from '../controllers/quiz.controller.js';
import * as chatController from '../controllers/chat.controller.js';

const router = Router();

// Wraps multer so file-type/size errors return 400 JSON instead of 500.
function withUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fișierul depășește limita de 20 MB.' });
    }
    return res.status(400).json({ error: err.message });
  });
}

// Public — oricine poate citi
router.get('/', notesController.list);
router.get('/:id', notesController.getById);
router.get('/:id/comments', commentsController.list);

// Necesită autentificare
router.post('/', requireAuth, withUpload, notesController.create);
router.put('/:id', requireAuth, notesController.update);
router.delete('/:id', requireAuth, notesController.remove);

// Rating endpoints
router.post('/:id/ratings', requireAuth, ratingsController.create);
router.delete('/:id/ratings', requireAuth, ratingsController.deleteRating);
router.get('/:id/rating', requireAuth, ratingsController.getUserRating);

// Comments endpoints
router.post('/:id/comments', requireAuth, commentsController.create);
router.delete('/:id/comments/:commentId', requireAuth, commentsController.deleteComment);
router.put('/:id/comments/:commentId', requireAuth, commentsController.updateComment);

// Quiz generator
router.get('/:id/quiz', requireAuth, quizController.generate);

// AI Chat
router.post('/:id/chat', requireAuth, chatController.chat);

// Reports
router.post('/:id/reports', requireAuth, reportsController.create);

// Duplicate detection
router.post('/check/duplicates', requireAuth, duplicatesController.check);

export default router;
