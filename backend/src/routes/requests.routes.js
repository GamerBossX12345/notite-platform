import { Router } from 'express';
import { requireAuth, requireNotBanned, optionalAuth } from '../middleware/auth.js';
import * as requestsController from '../controllers/requests.controller.js';

const router = Router();

// Public (optionalAuth pentru filtrul ?mine=1)
router.get('/',    optionalAuth, requestsController.list);
router.get('/:id', requestsController.getById);

// Necesită autentificare
router.post('/',               requireAuth, requireNotBanned, requestsController.create);
router.post('/:id/fulfill',    requireAuth, requireNotBanned, requestsController.fulfill);
router.post('/:id/close',      requireAuth, requestsController.close);
router.post('/:id/reopen',     requireAuth, requestsController.reopen);
router.delete('/:id',          requireAuth, requestsController.remove);

export default router;
