import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import {
  getDashboardHandler,
  listUsersHandler,
  listAuditLogsHandler,
} from './admin.controller';

const router = Router();

// GET /api/v1/admin/dashboard   — stats summary (ADMIN, SUPER_ADMIN)
router.get(
  '/dashboard',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  getDashboardHandler,
);

// GET /api/v1/admin/users       — list all users (ADMIN, SUPER_ADMIN, SUPPORT)
router.get(
  '/users',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN', 'SUPPORT'),
  listUsersHandler,
);

// GET /api/v1/admin/audit-logs  — audit trail (SUPER_ADMIN only)
router.get(
  '/audit-logs',
  authenticate,
  requireRole('SUPER_ADMIN'),
  listAuditLogsHandler,
);

export default router;
