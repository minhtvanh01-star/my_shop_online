import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  createCodHandler,
  createStripeIntentHandler,
  createVNPayHandler,
  refundPaymentHandler,
  vnpayIPNHandler,
  vnpayReturnHandler,
} from './payments.controller';

const router = Router();

// JSON body routes — mounted AFTER express.json() in app.ts
router.post('/stripe/intent', authenticate, createStripeIntentHandler);
router.post('/vnpay/create', authenticate, createVNPayHandler);
router.post('/cod', authenticate, createCodHandler);
router.post(
  '/:id/refund',
  authenticate,
  requireAdmin,
  auditLog('REFUND_PAYMENT', 'Payment'),
  refundPaymentHandler,
);

// VNPay browser return + server IPN (no auth)
router.get('/vnpay/return', vnpayReturnHandler);
router.post('/vnpay/ipn', vnpayIPNHandler);

export default router;
