import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// Toate rutele de admin necesită autentificare + rol Admin.
router.use(requireAuth, requireAdmin);

router.get('/users',                    adminController.listUsers);
router.patch('/users/:id',              adminController.updateUser);
router.delete('/users/:id',             adminController.deleteUser);
router.post('/users/:id/suspend',       adminController.suspendUser);
router.post('/users/:id/unsuspend',     adminController.unsuspendUser);

router.get('/notes',              adminController.listNotes);
router.patch('/notes/:id',        adminController.updateNote);
router.delete('/notes/:id',       adminController.deleteNote);
router.post('/notes/:id/unhide',  adminController.unhideNote);

router.get('/reports',        adminController.listReports);
router.patch('/reports/:id',  adminController.updateReport);
router.delete('/reports/:id', adminController.deleteReport);

export default router;
