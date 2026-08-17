import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { settleCodOnDelivered } from '../payments/payments.service';
import type { AdminOrderListQueryDto, CreateOrderDto, UpdateOrderStatusDto } from './orders.schema';

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `ORD-${date}-${suffix}`;
}

const orderItemSelect = {
  id: true,
  productName: true,
  variantLabel: true,
  sku: true,
  quantity: true,
  unitPrice: true,
  totalPrice: true,
  currency: true,
};

const orderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  currency: true,
  subtotal: true,
  shippingFee: true,
  discountAmount: true,
  taxAmount: true,
  totalAmount: true,
  shippingAddress: true,
  notes: true,
  trackingNumber: true,
  shippedAt: true,
  deliveredAt: true,
  createdAt: true,
  orderItems: { select: orderItemSelect },
  payments: { select: { id: true, provider: true, status: true, amount: true, paidAt: true } },
};

export async function getUserOrders(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const where: Prisma.OrderWhereInput = { userId };

  const [total, items] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, skip, take: limit, select: orderSelect, orderBy: { createdAt: 'desc' } }),
  ]);

  return { items, total, page, limit };
}

export async function getOrderById(id: string, userId?: string, role?: string) {
  const isAdmin = role && ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(role);
  const order = await prisma.order.findFirst({
    where: { id, ...(!isAdmin && userId && { userId }) },
    include: {
      orderItems: true,
      payments: true,
      orderCoupons: { include: { coupon: { select: { code: true, type: true, value: true } } } },
    },
  });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  return order;
}

export async function createOrderFromCart(userId: string, dto: CreateOrderDto) {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: { include: { translations: { where: { locale: dto.locale } } } },
      variant: true,
    },
  });

  if (cartItems.length === 0) throw new AppError(400, 'Cart is empty', 'EMPTY_CART');

  // Early validation: product still active (user-friendly check, real stock check is inside tx)
  for (const item of cartItems) {
    if (!item.product.isActive || item.product.deletedAt) {
      const name = item.product.translations[0]?.name ?? item.product.sku;
      throw new AppError(400, `"${name}" is no longer available`, 'PRODUCT_INACTIVE');
    }
  }

  let coupon: Awaited<ReturnType<typeof prisma.coupon.findFirst>> | null = null;
  if (dto.couponCode) {
    const now = new Date();

    // BR-C01 step 1: exists + active
    coupon = await prisma.coupon.findFirst({
      where: { code: dto.couponCode, isActive: true, deletedAt: null },
    });
    if (!coupon) throw new AppError(400, 'Invalid or expired coupon', 'INVALID_COUPON');

    // BR-C01 step 2: within date range
    if (coupon.startDate && coupon.startDate > now) {
      throw new AppError(400, 'Coupon is not yet active', 'INVALID_COUPON');
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new AppError(400, 'Coupon has expired', 'COUPON_EXPIRED');
    }

    // BR-C01 step 3: usage limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new AppError(400, 'Coupon has reached its usage limit', 'COUPON_EXHAUSTED');
    }

    // BR-C01 step 4: per-user limit
    if (coupon.perUserLimit !== null) {
      const userUsageCount = await prisma.orderCoupon.count({
        where: { couponId: coupon.id, order: { userId } },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        throw new AppError(400, 'You have exceeded the usage limit for this coupon', 'COUPON_EXHAUSTED');
      }
    }

    // BR-C01 step 5: minimum order amount (checked after subtotal is computed below)
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const base = Number(item.product.basePrice);
    const modifier = item.variant ? Number(item.variant.priceModifier) : 0;
    return sum + (base + modifier) * item.quantity;
  }, 0);

  // BR-C01 step 5: minimum order amount
  if (coupon?.minOrderAmount !== null && coupon?.minOrderAmount !== undefined) {
    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new AppError(
        400,
        `Order must be at least ${coupon.minOrderAmount} to use this coupon`,
        'INVALID_COUPON',
      );
    }
  }

  let discountAmount = 0;
  if (coupon) {
    discountAmount =
      coupon.type === 'percentage'
        ? (subtotal * Number(coupon.value)) / 100
        : Math.min(Number(coupon.value), subtotal);
  }

  const totalAmount = subtotal - discountAmount;
  const orderNumber = generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        currency: dto.currency,
        subtotal,
        discountAmount,
        totalAmount,
        shippingAddress: dto.shippingAddress as Prisma.InputJsonValue,
        locale: dto.locale,
        notes: dto.notes,
        shippingMethodId: dto.shippingMethodId,
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.product.translations[0]?.name ?? item.product.sku,
            variantLabel: item.variant
              ? `${item.variant.optionName}: ${item.variant.optionValue}`
              : null,
            sku: item.variant?.sku ?? item.product.sku,
            quantity: item.quantity,
            unitPrice: Number(item.product.basePrice) + (item.variant ? Number(item.variant.priceModifier) : 0),
            totalPrice:
              (Number(item.product.basePrice) + (item.variant ? Number(item.variant.priceModifier) : 0)) * item.quantity,
            currency: dto.currency,
            productSnapshot: item.product as Prisma.InputJsonValue,
          })),
        },
        ...(coupon && {
          orderCoupons: {
            create: [{ couponId: coupon.id, discountApplied: discountAmount }],
          },
        }),
      },
      include: { orderItems: true },
    });

    // Atomic stock check + deduction — race-condition safe (BR-I01, BR-I02)
    // updateMany with WHERE stockQuantity >= quantity generates a single atomic SQL UPDATE.
    // If another transaction already decremented the stock, count===0 and this tx rolls back.
    for (const item of cartItems) {
      const productName = item.product.translations[0]?.name ?? item.product.sku;

      if (item.variantId) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new AppError(400, `Insufficient stock for "${productName}"`, 'INSUFFICIENT_STOCK');
        }
        const afterVariant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stockQuantity: true },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            orderId: created.id,
            actorId: userId,
            type: 'sale',
            quantityChange: -item.quantity,
            quantityBefore: afterVariant!.stockQuantity + item.quantity,
            quantityAfter: afterVariant!.stockQuantity,
          },
        });
      } else {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stockQuantity: { gte: item.quantity }, deletedAt: null },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new AppError(400, `Insufficient stock for "${productName}"`, 'INSUFFICIENT_STOCK');
        }
        const afterProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            orderId: created.id,
            actorId: userId,
            type: 'sale',
            quantityChange: -item.quantity,
            quantityBefore: afterProduct!.stockQuantity + item.quantity,
            quantityAfter: afterProduct!.stockQuantity,
          },
        });
      }
    }

    // Coupon usedCount increments when payment completes (Stripe/VNPay webhook or COD delivery)
    // Clear cart
    await tx.cartItem.deleteMany({ where: { userId } });

    return created;
  });

  return order;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export async function cancelOrder(orderId: string, actorId: string, role: string) {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(role);

  const order = await prisma.order.findFirst({
    where: { id: orderId, ...(!isAdmin && { userId: actorId }) },
    include: { orderItems: true },
  });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');

  const allowedStatuses = isAdmin ? ['pending', 'confirmed'] : ['pending'];
  if (!allowedStatuses.includes(order.status)) {
    throw new AppError(400, 'Order cannot be cancelled at this stage', 'ORDER_CANNOT_CANCEL');
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'cancelled' } });

    for (const item of order.orderItems) {
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
  });
}

export async function getAdminOrders(query: AdminOrderListQueryDto) {
  const { page, limit, status, userId, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    ...(userId && { userId }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, skip, take: limit, select: orderSelect, orderBy: { createdAt: 'desc' } }),
  ]);

  return { items, total, page, limit };
}

export async function updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, processedBy: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(dto.status)) {
    throw new AppError(
      400,
      `Cannot transition order from '${order.status}' to '${dto.status}'`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: dto.status,
      processedBy,
      ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
      ...(dto.status === 'shipped' && { shippedAt: new Date() }),
      ...(dto.status === 'delivered' && { deliveredAt: new Date() }),
    },
  });

  if (dto.status === 'delivered') {
    await settleCodOnDelivered(orderId);
  }

  return updated;
}
