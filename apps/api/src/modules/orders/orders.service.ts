import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { convertCatalogAmount, resolveOrderCurrency } from '../../utils/exchange';
import { getUsdToVndRate } from '../../utils/exchange-rate';
import { settleCodOnDelivered, refundPayment } from '../payments/payments.service';
import { notifyIfLowStock } from '../inventory/inventory.service';
import { isWarehouseRole, WAREHOUSE_ORDER_STATUSES } from '../auth/auth.roles';
import { canCreateReturnRequest } from '../../utils/order-return';
import type {
  AdminOrderListQueryDto,
  CreateOrderDto,
  CreateReturnRequestDto,
  ReviewReturnRequestDto,
  UpdateOrderStatusDto,
  UserOrderListQueryDto,
} from './orders.schema';

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
  returnRequests: {
    select: {
      id: true,
      type: true,
      status: true,
      reason: true,
      adminNote: true,
      createdAt: true,
      reviewedAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

export async function getUserOrders(userId: string, query: UserOrderListQueryDto) {
  const { page, limit, status } = query;
  const skip = (page - 1) * limit;
  const where: Prisma.OrderWhereInput = { userId, ...(status ? { status } : {}) };

  const [total, items] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, skip, take: limit, select: orderSelect, orderBy: { createdAt: 'desc' } }),
  ]);

  return { items, total, page, limit };
}

export async function getOrderById(id: string, userId?: string, role?: string) {
  const isStaffOps = role && ['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'WAREHOUSE'].includes(role);
  const order = await prisma.order.findFirst({
    where: { id, ...(!isStaffOps && userId && { userId }) },
    include: {
      orderItems: true,
      payments: true,
      orderCoupons: { include: { coupon: { select: { code: true, type: true, value: true } } } },
      returnRequests: { orderBy: { createdAt: 'desc' as const } },
    },
  });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  if (isWarehouseRole(role)) {
    if (!(WAREHOUSE_ORDER_STATUSES as readonly string[]).includes(order.status)) {
      throw new AppError(404, 'Order not found', 'NOT_FOUND');
    }
    return stripWarehouseFinance(order as unknown as Record<string, unknown>);
  }
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

  const orderCurrency = resolveOrderCurrency(dto.locale, dto.currency);
  const exchangeRate = orderCurrency === 'VND' ? await getUsdToVndRate() : 1;

  const pricedLines = cartItems.map((item) => {
    const catalogUnit =
      Number(item.product.basePrice) + (item.variant ? Number(item.variant.priceModifier) : 0);
    const unitPrice = convertCatalogAmount(
      catalogUnit,
      item.product.currency,
      orderCurrency,
      exchangeRate,
    );
    return { item, unitPrice, lineTotal: unitPrice * item.quantity };
  });

  const subtotal = pricedLines.reduce((sum, line) => sum + line.lineTotal, 0);

  // BR-C01 step 5: minimum order amount (coupon floors are stored in USD)
  if (coupon?.minOrderAmount !== null && coupon?.minOrderAmount !== undefined) {
    const minInOrderCurrency = convertCatalogAmount(
      Number(coupon.minOrderAmount),
      'USD',
      orderCurrency,
      exchangeRate,
    );
    if (subtotal < minInOrderCurrency) {
      throw new AppError(
        400,
        `Order must be at least ${coupon.minOrderAmount} to use this coupon`,
        'INVALID_COUPON',
      );
    }
  }

  let discountAmount = 0;
  if (coupon) {
    if (coupon.type === 'percentage') {
      const percent = Math.min(Math.max(Number(coupon.value), 0), 100);
      discountAmount = (subtotal * percent) / 100;
    } else {
      discountAmount = Math.min(
        convertCatalogAmount(Number(coupon.value), 'USD', orderCurrency, exchangeRate),
        subtotal,
      );
    }
  }

  const totalAmount = Math.max(subtotal - discountAmount, 0);
  const orderNumber = generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        currency: orderCurrency,
        exchangeRate,
        subtotal,
        discountAmount,
        totalAmount,
        shippingAddress: dto.shippingAddress as Prisma.InputJsonValue,
        locale: dto.locale,
        notes: dto.notes,
        shippingMethodId: dto.shippingMethodId,
        orderItems: {
          create: pricedLines.map(({ item, unitPrice, lineTotal }) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.product.translations[0]?.name ?? item.product.sku,
            variantLabel: item.variant
              ? `${item.variant.optionName}: ${item.variant.optionValue}`
              : null,
            sku: item.variant?.sku ?? item.product.sku,
            quantity: item.quantity,
            unitPrice,
            totalPrice: lineTotal,
            currency: orderCurrency,
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

  await Promise.all(
    order.orderItems.map(async (item) => {
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stockQuantity: true },
        });
        if (variant) await notifyIfLowStock(item.productId, item.variantId, variant.stockQuantity);
        return;
      }
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { stockQuantity: true },
      });
      if (product) await notifyIfLowStock(item.productId, null, product.stockQuantity);
    }),
  );

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

async function restockOrderLines(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorId: string,
  items: { productId: string; variantId: string | null; quantity: number }[],
) {
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

export async function cancelOrder(orderId: string, actorId: string, role: string, reason?: string) {
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

  const notes = reason
    ? [order.notes, `Cancel: ${reason}`].filter(Boolean).join('\n')
    : order.notes;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'cancelled', notes } });
    await restockOrderLines(tx, orderId, actorId, order.orderItems);
  });
}

const WAREHOUSE_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['processing'],
  processing: ['shipped'],
};

function stripWarehouseFinance<T extends Record<string, unknown>>(order: T) {
  const {
    totalAmount: _t,
    subtotal: _s,
    discountAmount: _d,
    taxAmount: _x,
    shippingFee: _f,
    payments: _p,
    orderCoupons: _c,
    orderItems,
    ...rest
  } = order as T & {
    totalAmount?: unknown;
    subtotal?: unknown;
    discountAmount?: unknown;
    taxAmount?: unknown;
    shippingFee?: unknown;
    payments?: unknown;
    orderItems?: Array<Record<string, unknown>>;
  };
  return {
    ...rest,
    ...(orderItems
      ? {
          orderItems: orderItems.map((item) => {
            const { unitPrice: _u, totalPrice: _tp, ...line } = item;
            return line;
          }),
        }
      : {}),
  };
}

export async function getAdminOrders(
  query: AdminOrderListQueryDto,
  role?: string,
): Promise<{ items: unknown[]; total: number; page: number; limit: number }> {
  const { page, limit, status, userId, search } = query;
  const skip = (page - 1) * limit;

  const warehouseOnly = isWarehouseRole(role);
  if (
    warehouseOnly &&
    status &&
    !(WAREHOUSE_ORDER_STATUSES as readonly string[]).includes(status)
  ) {
    return { items: [], total: 0, page, limit };
  }
  const statusFilter = warehouseOnly
    ? status ?? { in: [...WAREHOUSE_ORDER_STATUSES] }
    : status;

  const where: Prisma.OrderWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
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

  return {
    items: isWarehouseRole(role) ? items.map((row) => stripWarehouseFinance(row)) : [...items],
    total,
    page,
    limit,
  };
}

export async function updateOrderStatus(
  orderId: string,
  dto: UpdateOrderStatusDto,
  processedBy: string,
  role?: string,
) {
  if (dto.status === 'refunded') {
    if (isWarehouseRole(role)) {
      throw new AppError(403, 'Warehouse cannot refund orders', 'FORBIDDEN');
    }
    const payment = await prisma.payment.findFirst({
      where: { orderId, status: 'completed' },
      select: { id: true },
    });
    if (payment) {
      await refundPayment(payment.id, { reason: 'Admin status refund' }, processedBy);
      return getOrderById(orderId, processedBy, role);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (!current) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');

    if (
      isWarehouseRole(role) &&
      dto.status === 'shipped' &&
      !dto.trackingNumber?.trim() &&
      !current.trackingNumber
    ) {
      throw new AppError(400, 'Tracking number is required', 'TRACKING_REQUIRED');
    }

    const allowed = isWarehouseRole(role)
      ? (WAREHOUSE_TRANSITIONS[current.status] ?? [])
      : (VALID_TRANSITIONS[current.status] ?? []);
    if (!allowed.includes(dto.status)) {
      throw new AppError(
        400,
        `Cannot transition order from '${current.status}' to '${dto.status}'`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    if (dto.status === 'shipped' && !dto.trackingNumber && !current.trackingNumber) {
      throw new AppError(400, 'Tracking number is required when shipping', 'TRACKING_REQUIRED');
    }

    const next = await tx.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        processedBy,
        ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
        ...(dto.status === 'shipped' && { shippedAt: new Date() }),
        ...(dto.status === 'delivered' && { deliveredAt: new Date() }),
      },
    });

    if (dto.status === 'cancelled' || dto.status === 'refunded') {
      await restockOrderLines(tx, orderId, processedBy, current.orderItems);
    }

    return next;
  });

  if (dto.status === 'delivered') {
    await settleCodOnDelivered(orderId);
  }

  return isWarehouseRole(role) ? stripWarehouseFinance(updated) : updated;
}

const returnSelect = {
  id: true,
  orderId: true,
  type: true,
  status: true,
  reason: true,
  adminNote: true,
  createdAt: true,
  reviewedAt: true,
} as const;

export async function createReturnRequest(
  orderId: string,
  userId: string,
  dto: CreateReturnRequestDto,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { returnRequests: { select: { status: true } } },
  });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');

  const hasOpenRequest = order.returnRequests.some((row) =>
    ['pending', 'approved'].includes(row.status),
  );
  if (
    !canCreateReturnRequest({
      orderStatus: order.status,
      deliveredAt: order.deliveredAt,
      hasOpenRequest,
    })
  ) {
    throw new AppError(
      400,
      'Return is only available within 7 days of delivery',
      'RETURN_NOT_ALLOWED',
    );
  }

  return prisma.orderReturnRequest.create({
    data: {
      orderId,
      userId,
      type: dto.type,
      reason: dto.reason.trim(),
    },
    select: returnSelect,
  });
}

export async function reviewReturnRequest(
  orderId: string,
  returnId: string,
  dto: ReviewReturnRequestDto,
  actorId: string,
  role: string,
) {
  const request = await prisma.orderReturnRequest.findFirst({
    where: { id: returnId, orderId },
  });
  if (!request) throw new AppError(404, 'Return request not found', 'RETURN_NOT_FOUND');
  if (request.status !== 'pending') {
    throw new AppError(400, 'Return request already reviewed', 'RETURN_ALREADY_REVIEWED');
  }

  if (dto.status === 'approved' && request.type === 'refund' && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new AppError(403, 'Only admin can approve refunds', 'FORBIDDEN');
  }

  if (dto.status === 'rejected') {
    return prisma.orderReturnRequest.update({
      where: { id: returnId },
      data: {
        status: 'rejected',
        adminNote: dto.adminNote?.trim() || null,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      },
      select: returnSelect,
    });
  }

  if (request.type === 'refund') {
    const payment = await prisma.payment.findFirst({
      where: { orderId, status: 'completed' },
      select: { id: true },
    });
    if (payment) {
      await refundPayment(payment.id, { reason: request.reason }, actorId);
    } else {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });
      if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: { status: 'refunded' } });
        await restockOrderLines(tx, orderId, actorId, order.orderItems);
      });
    }
  }

  return prisma.orderReturnRequest.update({
    where: { id: returnId },
    data: {
      status: 'completed',
      adminNote: dto.adminNote?.trim() || null,
      reviewedBy: actorId,
      reviewedAt: new Date(),
    },
    select: returnSelect,
  });
}
