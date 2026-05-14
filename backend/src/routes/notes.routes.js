import { Router } from 'express';
import { requireAuth, requireNotBanned } from '../middleware/auth.js';
import { quizRateLimit, chatRateLimit, flashcardsRateLimit } from '../middleware/aiRateLimit.js';
import { upload } from '../middleware/upload.js';
import * as notesController from '../controllers/notes.controller.js';
import * as ratingsController from '../controllers/ratings.controller.js';
import * as commentsController from '../controllers/comments.controller.js';
import * as reportsController from '../controllers/reports.controller.js';
import * as duplicatesController from '../controllers/duplicates.controller.js';
import * as quizController from '../controllers/quiz.controller.js';
import * as chatController from '../controllers/chat.controller.js';
import * as savedController from '../controllers/saved.controller.js';
import * as tagsController from '../controllers/tags.controller.js';
import * as flashcardsController from '../controllers/flashcards.controller.js';

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
router.get('/tags', tagsController.list);
router.get('/trending', notesController.trending);
router.get('/search/semantic', notesController.semanticSearch);
router.get('/:id', notesController.getById);
router.get('/:id/similar', notesController.similarNotes);
router.get('/:id/comments', commentsController.list);

// Necesită autentificare (și cont nebanat)
router.post('/', requireAuth, requireNotBanned, withUpload, notesController.create);
router.put('/:id', requireAuth, requireNotBanned, withUpload, notesController.update);
router.delete('/:id', requireAuth, notesController.remove);

// Rating endpoints
router.post('/:id/ratings', requireAuth, requireNotBanned, ratingsController.create);
router.delete('/:id/ratings', requireAuth, ratingsController.deleteRating);
router.get('/:id/rating', requireAuth, ratingsController.getUserRating);

// Comments endpoints
router.post('/:id/comments', requireAuth, requireNotBanned, commentsController.create);
router.delete('/:id/comments/:commentId', requireAuth, commentsController.deleteComment);
router.put('/:id/comments/:commentId', requireAuth, requireNotBanned, commentsController.updateComment);

// Quiz generator — max 3/oră/user
router.get('/:id/quiz', requireAuth, quizRateLimit, quizController.generate);

// AI Chat — conversație persistată. POST e rate-limited (max 5/oră/user).
router.get('/:id/chat',    requireAuth, chatController.getHistory);
router.post('/:id/chat',   requireAuth, chatRateLimit, chatController.chat);
router.delete('/:id/chat', requireAuth, chatController.clearHistory);

// Flashcards — generare AI, max 2/oră/user
router.post('/:id/flashcards/generate', requireAuth, flashcardsRateLimit, flashcardsController.generate);

// Bookmark / Salvează notiță
router.get('/:id/save',    requireAuth, savedController.getStatus);
router.post('/:id/save',   requireAuth, savedController.save);
router.delete('/:id/save', requireAuth, savedController.unsave);

// Reports
router.post('/:id/reports', requireAuth, reportsController.create);

// Duplicate detection
router.post('/check/duplicates', requireAuth, duplicatesController.check);

export default router;
