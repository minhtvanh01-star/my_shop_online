import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  createCouponHandler,
  deleteCouponHandler,
  listCouponsHandler,
  updateCouponHandler,
} from './coupons.controller';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', listCouponsHandler);
router.post('/', auditLog('CREATE_COUPON', 'Coupon'), createCouponHandler);
router.put('/:id', auditLog('UPDATE_COUPON', 'Coupon'), updateCouponHandler);
router.delete('/:id', auditLog('DELETE_COUPON', 'Coupon'), deleteCouponHandler);

export default router;
