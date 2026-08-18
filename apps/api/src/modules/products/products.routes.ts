import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  createProductHandler,
  createVariantHandler,
  deleteProductHandler,
  getAdminProductHandler,
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
router.get('/admin/:id', authenticate, requireAdmin, getAdminProductHandler);
router.get('/:slug', getProductHandler);
router.post('/', authenticate, requireAdmin, auditLog('CREATE_PRODUCT', 'Product'), createProductHandler);
router.put('/:id', authenticate, requireAdmin, auditLog('UPDATE_PRODUCT', 'Product'), updateProductHandler);
router.patch('/:id/active', authenticate, requireAdmin, auditLog('TOGGLE_PRODUCT_ACTIVE', 'Product'), toggleActiveHandler);
router.delete('/:id', authenticate, requireAdmin, auditLog('DELETE_PRODUCT', 'Product'), deleteProductHandler);
router.get('/:id/variants', getVariantsHandler);
router.post('/:id/variants', authenticate, requireAdmin, auditLog('CREATE_VARIANT', 'ProductVariant'), createVariantHandler);

export default router;
