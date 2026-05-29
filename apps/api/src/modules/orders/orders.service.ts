import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
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

export async function getOrderById(id: string, userId?: string) {
  const order = await prisma.order.findFirst({
    where: { id, ...(userId && { userId }) },
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

  // Validate stock and compute prices
  for (const item of cartItems) {
    const stock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
    if (stock < item.quantity) {
      throw new AppError(
        400,
        `Insufficient stock for ${item.product.translations[0]?.name ?? item.product.sku}`,
        'INSUFFICIENT_STOCK',
      );
    }
  }

  let coupon: Awaited<ReturnType<typeof prisma.coupon.findFirst>> | null = null;
  if (dto.couponCode) {
    coupon = await prisma.coupon.findFirst({
      where: {
        code: dto.couponCode,
        isActive: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });
    if (!coupon || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)) {
      throw new AppError(400, 'Invalid or expired coupon', 'INVALID_COUPON');
    }
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const base = Number(item.product.basePrice);
    const modifier = item.variant ? Number(item.variant.priceModifier) : 0;
    return sum + (base + modifier) * item.quantity;
  }, 0);

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

    // Deduct stock
    for (const item of cartItems) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          orderId: created.id,
          actorId: userId,
          type: 'sale',
          quantityChange: -item.quantity,
          quantityBefore: item.variant ? item.variant.stockQuantity : item.product.stockQuantity,
          quantityAfter: (item.variant ? item.variant.stockQuantity : item.product.stockQuantity) - item.quantity,
        },
      });
    }

    if (coupon) {
      await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { userId } });

    return created;
  });

  return order;
}

export async function cancelOrder(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');

  if (!['pending', 'confirmed'].includes(order.status)) {
    throw new AppError(400, 'Order cannot be cancelled at this stage', 'INVALID_STATUS');
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: 'cancelled' } });
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
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: dto.status,
      processedBy,
      ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
      ...(dto.status === 'shipped' && { shippedAt: new Date() }),
      ...(dto.status === 'delivered' && { deliveredAt: new Date() }),
    },
  });
}
