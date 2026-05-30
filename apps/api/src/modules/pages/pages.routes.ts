import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
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
router.post('/', authenticate, requireAdmin, createPageHandler);

// PUT /api/v1/pages/:id — admin: update page
router.put('/:id', authenticate, requireAdmin, updatePageHandler);

// DELETE /api/v1/pages/:id — admin: soft-delete page
router.delete('/:id', authenticate, requireAdmin, deletePageHandler);

export default router;
