import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  getPageBySlugHandler,
  createPageHandler,
  updatePageHandler,
  deletePageHandler,
} from './pages.controller';

const router = Router();

// GET /api/v1/pages/:slug — public: get published page by slug
router.get('/:slug', getPageBySlugHandler);

// POST /api/v1/pages — admin: create page
router.post('/', authenticate, requireAdmin, auditLog('CREATE_PAGE', 'Page'), createPageHandler);

// PUT /api/v1/pages/:id — admin: update page
router.put('/:id', authenticate, requireAdmin, auditLog('UPDATE_PAGE', 'Page'), updatePageHandler);

// DELETE /api/v1/pages/:id — admin: soft-delete page
router.delete('/:id', authenticate, requireAdmin, auditLog('DELETE_PAGE', 'Page'), deletePageHandler);

export default router;
