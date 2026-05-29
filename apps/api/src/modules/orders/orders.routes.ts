import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import {
  cancelOrderHandler,
  createOrderHandler,
  getAdminOrdersHandler,
  getOrderHandler,
  getUserOrdersHandler,
  updateOrderStatusHandler,
} from './orders.controller';

const router = Router();

router.use(authenticate);

router.get('/', getUserOrdersHandler);
router.get('/admin', requireAdmin, getAdminOrdersHandler);
router.get('/:id', getOrderHandler);
router.post('/', createOrderHandler);
router.patch('/:id/cancel', cancelOrderHandler);
router.patch('/:id/status', requireAdmin, updateOrderStatusHandler);

export default router;
