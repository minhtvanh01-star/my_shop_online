import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireOrderOps, requireRole } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  cancelOrderHandler,
  createOrderHandler,
  createReturnRequestHandler,
  getAdminOrdersHandler,
  getOrderHandler,
  getUserOrdersHandler,
  reviewReturnRequestHandler,
  updateOrderStatusHandler,
} from './orders.controller';

const router = Router();

router.use(authenticate);

router.get('/', getUserOrdersHandler);
router.get('/admin', requireOrderOps, getAdminOrdersHandler);
router.get('/:id', getOrderHandler);
router.post('/', createOrderHandler);
router.patch('/:id/cancel', auditLog('CANCEL_ORDER', 'Order'), cancelOrderHandler);
router.post('/:id/returns', createReturnRequestHandler);
router.patch(
  '/:id/returns/:returnId',
  requireRole('SUPPORT', 'ADMIN', 'SUPER_ADMIN'),
  auditLog('REVIEW_RETURN_REQUEST', 'OrderReturnRequest'),
  reviewReturnRequestHandler,
);
router.patch('/:id/status', requireOrderOps, auditLog('UPDATE_ORDER_STATUS', 'Order'), updateOrderStatusHandler);

export default router;
