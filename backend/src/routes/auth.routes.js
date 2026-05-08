import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);

// TODO: endpoint /me care întoarce user-ul curent (folosește requireAuth).
// E util pe frontend la pornirea aplicației ca să verifici dacă tokenul stocat
// mai e valid și să afli date despre user fără alt cerere.

export default router;
