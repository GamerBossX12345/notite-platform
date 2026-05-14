import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as appealsController from '../controllers/appeals.controller.js';
import * as savedController from '../controllers/saved.controller.js';
import * as auditController from '../controllers/audit.controller.js';
import * as teacherController from '../controllers/teacher.controller.js';
import * as flashcardsController from '../controllers/flashcards.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.get('/verify-device', authController.verifyDeviceLogin);
router.get('/me', requireAuth, authController.me);
router.get('/me/saved', requireAuth, savedController.listMine);
router.get('/me/audit-log', requireAuth, auditController.listMine);
router.post('/teacher-request',   requireAuth, teacherController.submitRequest);
router.get('/teacher-request/me', requireAuth, teacherController.getMyRequest);

// Flashcards — manage personal
router.get('/me/flashcards',              requireAuth, flashcardsController.listMine);
router.get('/me/flashcards/stats',        requireAuth, flashcardsController.stats);
router.post('/me/flashcards/:id/review',  requireAuth, flashcardsController.review);
router.delete('/me/flashcards/:id',       requireAuth, flashcardsController.remove);
router.delete('/me/flashcards',           requireAuth, flashcardsController.removeDeck);
router.patch('/settings', requireAuth, authController.updateSettings);
router.patch('/profile', requireAuth, authController.updateProfile);
router.delete('/account', requireAuth, authController.deleteAccount);
router.post('/ban-appeal', requireAuth, appealsController.submitAppeal);
router.get('/ban-history', requireAuth, authController.banHistory);
router.post('/notes/:id/appeal', requireAuth, appealsController.submitNoteAppeal);
router.get('/users', authController.listPublicUsers);
router.get('/users/:username', authController.getPublicProfile);

// Public — listă apeluri publice (anonimizate). NU necesită auth.
router.get('/appeals/public', appealsController.listPublicAppeals);

// TODO: endpoint /me care întoarce user-ul curent (folosește requireAuth).
// E util pe frontend la pornirea aplicației ca să verifici dacă tokenul stocat
// mai e valid și să afli date despre user fără alt cerere.

export default router;
