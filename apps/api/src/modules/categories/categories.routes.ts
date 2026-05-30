import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
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
router.post('/', authenticate, requireAdmin, createCategoryHandler);
router.put('/:id', authenticate, requireAdmin, updateCategoryHandler);
router.delete('/:id', authenticate, requireAdmin, deleteCategoryHandler);

export default router;
