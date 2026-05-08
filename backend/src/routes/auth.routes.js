import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

// TODO: endpoint /me care întoarce user-ul curent (folosește requireAuth).
// E util pe frontend la pornirea aplicației ca să verifici dacă tokenul stocat
// mai e valid și să afli date despre user fără alt cerere.

export default router;
