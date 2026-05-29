import express, { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  createStripeIntentHandler,
  createVNPayHandler,
  stripeWebhookHandler,
  vnpayIPNHandler,
  vnpayReturnHandler,
} from './payments.controller';

const router = Router();

// Stripe webhook — raw body, no auth
router.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
);

router.post('/stripe/intent', authenticate, createStripeIntentHandler);
router.post('/vnpay/create', authenticate, createVNPayHandler);

// VNPay return & IPN — called by VNPay servers (no auth)
router.get('/vnpay/return', vnpayReturnHandler);
router.post('/vnpay/ipn', vnpayIPNHandler);

export default router;
