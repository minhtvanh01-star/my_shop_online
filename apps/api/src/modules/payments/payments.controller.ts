import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import { StripeIntentSchema, VNPayCreateSchema } from './payments.schema';
import * as PaymentsService from './payments.service';

export async function createStripeIntentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = StripeIntentSchema.parse(req.body);
    const result = await PaymentsService.createStripeIntent(orderId, req.user!.id);
    ok(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function stripeWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['stripe-signature'] as string;
    await PaymentsService.handleStripeWebhook(req.body as Buffer, signature);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export async function createVNPayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = VNPayCreateSchema.parse(req.body);
    const ipAddr = req.headers['x-forwarded-for'] as string ?? req.ip ?? '127.0.0.1';
    const result = await PaymentsService.createVNPayPayment(dto, req.user!.id, ipAddr);
    ok(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function vnpayReturnHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await PaymentsService.handleVNPayReturn(req.query as Record<string, string>);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function vnpayIPNHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await PaymentsService.handleVNPayIPN(req.query as Record<string, string>);
    res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    next(err);
  }
}
