import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoryBySlugHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from './categories.controller';

const router = Router();

// Public routes
router.get('/', listCategoriesHandler);
router.get('/:slug', getCategoryBySlugHandler);

// Admin routes
router.post('/', authenticate, requireAdmin, auditLog('CREATE_CATEGORY', 'Category'), createCategoryHandler);
router.put('/:id', authenticate, requireAdmin, auditLog('UPDATE_CATEGORY', 'Category'), updateCategoryHandler);
router.delete('/:id', authenticate, requireAdmin, auditLog('DELETE_CATEGORY', 'Category'), deleteCategoryHandler);

export default router;
