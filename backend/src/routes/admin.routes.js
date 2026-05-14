import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireHeadAdmin } from '../middleware/admin.js';
import * as adminController from '../controllers/admin.controller.js';
import * as adminChatController from '../controllers/adminChat.controller.js';
import * as appealsController from '../controllers/appeals.controller.js';
import * as systemConfigController from '../controllers/systemConfig.controller.js';
import * as tagsController from '../controllers/tags.controller.js';
import * as teacherController from '../controllers/teacher.controller.js';
import * as auditController from '../controllers/audit.controller.js';

const router = Router();

// Toate rutele de admin necesită autentificare + rol Admin.
router.use(requireAuth, requireAdmin);

router.get('/users',                    adminController.listUsers);
router.patch('/users/:id',              adminController.updateUser);
router.delete('/users/:id',             adminController.deleteUser);
router.post('/users/:id/suspend',       adminController.suspendUser);
router.post('/users/:id/unsuspend',     adminController.unsuspendUser);
router.post('/users/:id/ban',           adminController.banUser);
router.post('/users/:id/unban',         adminController.unbanUser);
router.post('/users/:id/warn',          adminController.warnUser);
router.post('/users/:id/set-role',      requireHeadAdmin, adminController.setRole);

router.get('/appeals',                  appealsController.listAppeals);
router.get('/appeals/:id',              appealsController.getAppeal);
router.post('/appeals/:id/open',        appealsController.openAppeal);
router.post('/appeals/:id/resolve',     appealsController.resolveAppeal);

router.get('/note-appeals',                  appealsController.listNoteAppeals);
router.get('/note-appeals/:id',              appealsController.getNoteAppeal);
router.post('/note-appeals/:id/open',        appealsController.openNoteAppeal);
router.post('/note-appeals/:id/resolve',     appealsController.resolveNoteAppeal);

router.get('/notes',                          adminController.listNotes);
router.patch('/notes/:id',                    adminController.updateNote);
router.delete('/notes/:id',                   adminController.deleteNote);
router.post('/notes/:id/unhide',              adminController.unhideNote);
router.post('/notes/:id/schedule-deletion',   adminController.scheduleNoteDeletion);
router.post('/notes/:id/cancel-deletion',     adminController.cancelNoteDeletion);

router.get('/reports',        adminController.listReports);
router.patch('/reports/:id',  adminController.updateReport);
router.delete('/reports/:id', adminController.deleteReport);

router.get('/chat',           adminChatController.getMessages);
router.post('/chat',          adminChatController.sendMessage);
router.delete('/chat/:id',    adminChatController.deleteMessage);

router.get('/system-config',   requireHeadAdmin, systemConfigController.getConfig);
router.patch('/system-config', requireHeadAdmin, systemConfigController.updateConfig);

router.post('/server/restart', requireHeadAdmin, adminController.restartServer);

// Tags — head admin gestionează tag-urile oficiale
router.post('/tags',         requireHeadAdmin, tagsController.createOfficial);
router.patch('/tags/:id',    requireHeadAdmin, tagsController.update);
router.delete('/tags/:id',   requireHeadAdmin, tagsController.remove);

// Teacher verification — head admin aprobă / respinge cereri
router.get('/teacher-requests',                requireHeadAdmin, teacherController.listRequests);
router.post('/teacher-requests/:id/approve',   requireHeadAdmin, teacherController.approve);
router.post('/teacher-requests/:id/reject',    requireHeadAdmin, teacherController.reject);
router.patch('/users/:id/teacher',             requireHeadAdmin, teacherController.setTeacherManual);

// Audit log — head admin vede toate intrările
router.get('/audit-log',  requireHeadAdmin, auditController.listAll);

export default router;
