import crypto from 'crypto';
import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/error.middleware';
import { toStripeAmount } from '../../utils/money';
import { convertCatalogAmount } from '../../utils/exchange';
import type { CodCreateDto, RefundPaymentDto, VNPayCreateDto } from './payments.schema';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

async function incrementCouponsForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const orderCoupons = await tx.orderCoupon.findMany({ where: { orderId } });
  for (const row of orderCoupons) {
    await tx.coupon.update({
      where: { id: row.couponId },
      data: { usedCount: { increment: 1 } },
    });
  }
}

async function decrementCouponsForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const orderCoupons = await tx.orderCoupon.findMany({ where: { orderId } });
  for (const row of orderCoupons) {
    await tx.coupon.updateMany({
      where: { id: row.couponId, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }
}

/** Restock line items (same pattern as order cancel). */
async function restockOrderItems(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorId: string,
) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { stockQuantity: true },
    });

    if (item.variantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        select: { stockQuantity: true },
      });
      if (variant) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            orderId,
            actorId,
            type: 'return',
            quantityChange: item.quantity,
            quantityBefore: variant.stockQuantity,
            quantityAfter: variant.stockQuantity + item.quantity,
          },
        });
      }
    } else if (product) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          orderId,
          actorId,
          type: 'return',
          quantityChange: item.quantity,
          quantityBefore: product.stockQuantity,
          quantityAfter: product.stockQuantity + item.quantity,
        },
      });
    }
  }
}

async function completePayment(opts: {
  paymentId: string;
  orderId: string;
  providerResponse?: unknown;
  confirmOrder?: boolean;
}) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: opts.paymentId } });
    if (!payment || payment.status === 'completed') return;

    await tx.payment.update({
      where: { id: opts.paymentId },
      data: {
        status: 'completed',
        paidAt: new Date(),
        providerResponse: opts.providerResponse as object | undefined,
      },
    });

    if (opts.confirmOrder !== false) {
      await tx.order.update({
        where: { id: opts.orderId },
        data: { status: 'confirmed' },
      });
    }

    await incrementCouponsForOrder(tx, opts.orderId);
  });
}

// ── Stripe ──────────────────────────────────────────────────────────────────

export async function createStripeIntent(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, status: 'pending' },
  });
  if (!order) throw new AppError(404, 'Order not found or not payable', 'NOT_FOUND');

  const amount = toStripeAmount(Number(order.totalAmount), order.currency);

  const intent = await stripe.paymentIntents.create({
    amount,
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
    const payment = await prisma.payment.findFirst({ where: { providerTxId: intent.id } });
    if (!payment) return;
    await completePayment({
      paymentId: payment.id,
      orderId,
      providerResponse: intent,
      confirmOrder: true,
    });
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    await prisma.payment.updateMany({
      where: { providerTxId: intent.id },
      data: { status: 'failed', providerResponse: intent as object },
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
  const vndMajor =
    order.currency.toUpperCase() === 'VND'
      ? Math.round(Number(order.totalAmount))
      : convertCatalogAmount(
          Number(order.totalAmount),
          order.currency,
          'VND',
          Number(order.exchangeRate) || 25000,
        );
  const amountVnd = vndMajor * 100; // VNPay: VND major units * 100

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
  const { vnp_SecureHash: _hash, vnp_SecureHashType: _type, ...rest } = query;
  const sorted = vnpaySortObject(rest as Record<string, string>);
  const signData = new URLSearchParams(sorted).toString();
  const expectedHash = vnpayHmacSha512(env.VNPAY_HASH_SECRET, signData);

  if (expectedHash !== secureHash) {
    throw new AppError(400, 'Invalid VNPay signature', 'INVALID_SIGNATURE');
  }

  const txnRef = query.vnp_TxnRef;
  const responseCode = query.vnp_ResponseCode;
  const payment = await prisma.payment.findFirst({
    where: { providerTxId: txnRef },
    include: { order: { select: { orderNumber: true, locale: true } } },
  });

  if (!payment) {
    return { success: false as const, code: 'NOT_FOUND' as const, orderNumber: undefined, locale: undefined };
  }

  const meta = {
    orderNumber: payment.order.orderNumber,
    locale: payment.order.locale,
  };

  if (responseCode === '00') {
    if (payment.status !== 'completed') {
      await completePayment({
        paymentId: payment.id,
        orderId: payment.orderId,
        providerResponse: query,
        confirmOrder: true,
      });
    }
    return { success: true as const, ...meta };
  }

  await prisma.payment.updateMany({
    where: { providerTxId: txnRef },
    data: { status: 'failed', providerResponse: query as object },
  });
  return { success: false as const, code: responseCode, ...meta };
}

export async function handleVNPayIPN(query: Record<string, string>) {
  return handleVNPayReturn(query);
}

// ── COD ─────────────────────────────────────────────────────────────────────

export async function createCodPayment(dto: CodCreateDto, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: dto.orderId, userId, status: 'pending' },
  });
  if (!order) throw new AppError(404, 'Order not found or not payable', 'NOT_FOUND');
  if (order.locale !== 'vi' && order.currency !== 'VND') {
    throw new AppError(400, 'COD is only available for Vietnam orders', 'COD_NOT_AVAILABLE');
  }

  const existing = await prisma.payment.findFirst({
    where: { orderId: order.id, provider: 'cod' },
  });
  if (existing) throw new AppError(409, 'COD payment already exists', 'PAYMENT_EXISTS');

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: 'cod',
        providerTxId: `cod_${order.id}_${Date.now()}`,
        status: 'pending',
        amount: order.totalAmount,
        currency: order.currency,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'confirmed' },
    });
    return created;
  });

  return {
    paymentId: payment.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: payment.status,
  };
}

/** Complete pending COD payment when order is delivered (coupon usedCount bumps here). */
export async function settleCodOnDelivered(orderId: string) {
  const payment = await prisma.payment.findFirst({
    where: { orderId, provider: 'cod', status: 'pending' },
  });
  if (!payment) return;
  await completePayment({
    paymentId: payment.id,
    orderId,
    confirmOrder: false,
  });
}

// ── Refund ──────────────────────────────────────────────────────────────────

export async function refundPayment(paymentId: string, dto: RefundPaymentDto, actorId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });
  if (!payment) throw new AppError(404, 'Payment not found', 'NOT_FOUND');
  // Idempotent: already refunded → no second Stripe call / restock / coupon bump
  if (payment.status === 'refunded') {
    return { paymentId, status: 'refunded' as const };
  }
  if (payment.status !== 'completed') {
    throw new AppError(400, 'Only completed payments can be refunded', 'INVALID_PAYMENT_STATUS');
  }

  if (payment.provider === 'stripe') {
    await stripe.refunds.create({
      payment_intent: payment.providerTxId,
      reason: 'requested_by_customer',
      metadata: { actorId, note: dto.reason ?? '' },
    });
  }

  await prisma.$transaction(async (tx) => {
    // Re-check inside tx to avoid double restock under concurrency
    const fresh = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!fresh || fresh.status === 'refunded') return;
    if (fresh.status !== 'completed') {
      throw new AppError(400, 'Only completed payments can be refunded', 'INVALID_PAYMENT_STATUS');
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'refunded',
        providerResponse: {
          ...(typeof payment.providerResponse === 'object' && payment.providerResponse
            ? (payment.providerResponse as object)
            : {}),
          refundReason: dto.reason ?? null,
          refundedBy: actorId,
          refundedAt: new Date().toISOString(),
        },
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: 'refunded' },
    });

    await restockOrderItems(tx, payment.orderId, actorId);
    // Coupons were incremented on payment complete — reverse on refund
    await decrementCouponsForOrder(tx, payment.orderId);
  });

  return { paymentId, status: 'refunded' as const };
}
