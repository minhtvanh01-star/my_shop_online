import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  createProductHandler,
  createVariantHandler,
  deleteProductHandler,
  getProductHandler,
  getVariantsHandler,
  listAdminProductsHandler,
  listProductsHandler,
  toggleActiveHandler,
  updateProductHandler,
} from './products.controller';

const router = Router();

router.get('/', listProductsHandler);
router.get('/admin', authenticate, requireAdmin, listAdminProductsHandler);
router.get('/:slug', getProductHandler);
router.post('/', authenticate, requireAdmin, createProductHandler);
router.put('/:id', authenticate, requireAdmin, updateProductHandler);
router.patch('/:id/active', authenticate, requireAdmin, toggleActiveHandler);
router.delete('/:id', authenticate, requireAdmin, auditLog('DELETE_PRODUCT', 'Product'), deleteProductHandler);
router.get('/:id/variants', getVariantsHandler);
router.post('/:id/variants', authenticate, requireAdmin, createVariantHandler);

export default router;
