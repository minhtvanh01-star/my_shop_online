import crypto from 'crypto';
import Stripe from 'stripe';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/error.middleware';
import type { VNPayCreateDto } from './payments.schema';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// ── Stripe ──────────────────────────────────────────────────────────────────

export async function createStripeIntent(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, status: 'pending' },
  });
  if (!order) throw new AppError(404, 'Order not found or not payable', 'NOT_FOUND');

  const amountCents = Math.round(Number(order.totalAmount) * 100);

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: order.currency.toLowerCase(),
    metadata: { orderId, userId },
  });

  await prisma.payment.create({
    data: {
      orderId,
      provider: 'stripe',
      providerTxId: intent.id,
      status: 'pending',
      amount: order.totalAmount,
      currency: order.currency,
    },
  });

  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new AppError(400, 'Invalid Stripe webhook signature', 'INVALID_SIGNATURE');
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata.orderId;

    // BR-PAY03: idempotency — skip if already processed
    const existing = await prisma.payment.findFirst({
      where: { providerTxId: intent.id, status: 'completed' },
    });
    if (existing) return;

    await prisma.$transaction([
      prisma.payment.updateMany({
        where: { providerTxId: intent.id },
        data: { status: 'completed', paidAt: new Date(), providerResponse: intent as any },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'confirmed' },
      }),
    ]);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    await prisma.payment.updateMany({
      where: { providerTxId: intent.id },
      data: { status: 'failed', providerResponse: intent as any },
    });
  }
}

// ── VNPay ────────────────────────────────────────────────────────────────────

function vnpaySortObject(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function vnpayHmacSha512(secret: string, data: string): string {
  return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');
}

export async function createVNPayPayment(dto: VNPayCreateDto, userId: string, ipAddr: string) {
  const order = await prisma.order.findFirst({
    where: { id: dto.orderId, userId, status: 'pending' },
  });
  if (!order) throw new AppError(404, 'Order not found or not payable', 'NOT_FOUND');

  const txnRef = `${order.orderNumber}-${Date.now()}`;
  const amountVnd = Math.round(Number(order.totalAmount) * 100); // VNPay uses amount * 100

  const params: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: env.VNPAY_TMN_CODE,
    vnp_Locale: dto.locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber}`,
    vnp_OrderType: 'other',
    vnp_Amount: String(amountVnd),
    vnp_ReturnUrl: env.VNPAY_RETURN_URL,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14),
    ...(dto.bankCode && { vnp_BankCode: dto.bankCode }),
  };

  const sorted = vnpaySortObject(params);
  const signData = new URLSearchParams(sorted).toString();
  const secureHash = vnpayHmacSha512(env.VNPAY_HASH_SECRET, signData);
  sorted.vnp_SecureHash = secureHash;

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: 'vnpay',
      providerTxId: txnRef,
      status: 'pending',
      amount: order.totalAmount,
      currency: 'VND',
    },
  });

  const paymentUrl = `${env.VNPAY_URL}?${new URLSearchParams(sorted).toString()}`;
  return { paymentUrl };
}

export async function handleVNPayReturn(query: Record<string, string>) {
  const secureHash = query.vnp_SecureHash;
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
  const sorted = vnpaySortObject(rest as Record<string, string>);
  const signData = new URLSearchParams(sorted).toString();
  const expectedHash = vnpayHmacSha512(env.VNPAY_HASH_SECRET, signData);

  if (expectedHash !== secureHash) {
    throw new AppError(400, 'Invalid VNPay signature', 'INVALID_SIGNATURE');
  }

  const txnRef = query.vnp_TxnRef;
  const responseCode = query.vnp_ResponseCode;

  if (responseCode === '00') {
    const payment = await prisma.payment.findFirst({ where: { providerTxId: txnRef } });
    if (!payment) return { success: false, code: 'NOT_FOUND' };

    // BR-PAY03: idempotency — skip if already processed
    if (payment.status === 'completed') return { success: true };

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'completed', paidAt: new Date(), providerResponse: query as any },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'confirmed' },
      }),
    ]);
    return { success: true };
  }

  await prisma.payment.updateMany({
    where: { providerTxId: txnRef },
    data: { status: 'failed', providerResponse: query as any },
  });
  return { success: false, code: responseCode };
}

export async function handleVNPayIPN(query: Record<string, string>) {
  // Same signature check + idempotent update as return handler
  return handleVNPayReturn(query);
}
