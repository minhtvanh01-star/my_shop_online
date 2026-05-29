import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import {
  createProductHandler,
  createVariantHandler,
  deleteProductHandler,
  getProductHandler,
  getVariantsHandler,
  listProductsHandler,
  updateProductHandler,
} from './products.controller';

const router = Router();

router.get('/', listProductsHandler);
router.get('/:slug', getProductHandler);
router.post('/', authenticate, requireAdmin, createProductHandler);
router.put('/:id', authenticate, requireAdmin, updateProductHandler);
router.delete('/:id', authenticate, requireAdmin, deleteProductHandler);
router.get('/:id/variants', getVariantsHandler);
router.post('/:id/variants', authenticate, requireAdmin, createVariantHandler);

export default router;
