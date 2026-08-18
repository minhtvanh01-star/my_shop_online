import { InventoryTxType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { signedStockDelta } from '../../utils/inventory-delta';
import { INVENTORY_ROLES } from '../auth/auth.roles';
import type {
  AdjustStockDto,
  InventoryListQueryDto,
  InventoryTxQueryDto,
  UpsertStockAlertDto,
} from './inventory.schema';

/** docs/03: do not re-alert within 24 hours (`lastAlertedAt`). */
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const TX_TYPE: Record<AdjustStockDto['type'], InventoryTxType> = {
  purchase: InventoryTxType.purchase,
  adjustment: InventoryTxType.adjustment,
  damage: InventoryTxType.damage,
};

function localeOrFallback(locale?: string) {
  return locale && locale.trim() ? locale : undefined;
}

async function productIdsBelowAlert(): Promise<string[]> {
  const alerts = await prisma.stockAlert.findMany({
    where: { isActive: true },
    select: {
      productId: true,
      variantId: true,
      threshold: true,
      product: { select: { stockQuantity: true, deletedAt: true } },
      variant: { select: { stockQuantity: true, deletedAt: true } },
    },
  });
  const ids = new Set<string>();
  for (const alert of alerts) {
    if (alert.product.deletedAt) continue;
    const qty = alert.variantId
      ? alert.variant && !alert.variant.deletedAt
        ? alert.variant.stockQuantity
        : null
      : alert.product.stockQuantity;
    if (qty != null && qty <= alert.threshold) ids.add(alert.productId);
  }
  return [...ids];
}

export async function listStockItems(query: InventoryListQueryDto) {
  const { page, limit, search, inStock, lowStock } = query;
  const skip = (page - 1) * limit;
  const locale = localeOrFallback(query.locale);

  let lowStockIds: string[] | undefined;
  if (lowStock) {
    lowStockIds = await productIdsBelowAlert();
    if (lowStockIds.length === 0) {
      return { items: [], total: 0, page, limit };
    }
  }

  const and: Prisma.ProductWhereInput[] = [];
  if (inStock === true) {
    and.push({
      OR: [
        { stockQuantity: { gt: 0 } },
        { variants: { some: { deletedAt: null, stockQuantity: { gt: 0 } } } },
      ],
    });
  }
  if (inStock === false) {
    and.push({
      stockQuantity: { lte: 0 },
      variants: { none: { deletedAt: null, stockQuantity: { gt: 0 } } },
    });
  }
  if (search) {
    and.push({
      OR: [
        { sku: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        {
          translations: {
            some: {
              ...(locale ? { locale } : {}),
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
        {
          variants: {
            some: { deletedAt: null, sku: { contains: search, mode: 'insensitive' } },
          },
        },
      ],
    });
  }
  if (lowStockIds) {
    and.push({ id: { in: lowStockIds } });
  }

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(and.length ? { AND: and } : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sku: 'asc' },
      select: {
        id: true,
        sku: true,
        slug: true,
        stockQuantity: true,
        translations: {
          where: locale ? { locale } : undefined,
          select: { locale: true, name: true },
          take: locale ? 1 : 4,
        },
        variants: {
          where: { deletedAt: null },
          select: {
            id: true,
            sku: true,
            optionName: true,
            optionValue: true,
            stockQuantity: true,
            isActive: true,
          },
          orderBy: { sku: 'asc' },
        },
        stockAlerts: {
          where: { isActive: true },
          select: { id: true, variantId: true, threshold: true },
        },
      },
    }),
  ]);

  const items = products.map((product) => {
    const name =
      product.translations.find((row) => row.locale === locale)?.name
      ?? product.translations[0]?.name
      ?? product.sku;
    const productAlert = product.stockAlerts.find((row) => row.variantId == null);
    const rows = product.variants.length
      ? product.variants.map((variant) => {
          const alert = product.stockAlerts.find((row) => row.variantId === variant.id);
          return {
            productId: product.id,
            variantId: variant.id,
            sku: variant.sku,
            name,
            optionLabel: `${variant.optionName}: ${variant.optionValue}`,
            stockQuantity: variant.stockQuantity,
            threshold: alert?.threshold ?? null,
            lowStock: alert != null && variant.stockQuantity <= alert.threshold,
          };
        })
      : [
          {
            productId: product.id,
            variantId: null as string | null,
            sku: product.sku,
            name,
            optionLabel: null as string | null,
            stockQuantity: product.stockQuantity,
            threshold: productAlert?.threshold ?? null,
            lowStock: productAlert != null && product.stockQuantity <= productAlert.threshold,
          },
        ];
    return {
      productId: product.id,
      sku: product.sku,
      name,
      lines: lowStock ? rows.filter((row) => row.lowStock) : rows,
    };
  }).filter((product) => product.lines.length > 0);

  return { items, total, page, limit };
}

export async function adjustStock(dto: AdjustStockDto, actorId: string) {
  let delta: number;
  try {
    delta = signedStockDelta(dto.type, dto.quantity, dto.direction);
  } catch {
    throw new AppError(400, 'Invalid stock adjustment', 'INVALID_ADJUSTMENT');
  }

  const product = await prisma.product.findFirst({
    where: { id: dto.productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');

  if (dto.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: dto.variantId, productId: dto.productId, deletedAt: null },
      select: { id: true },
    });
    if (!variant) throw new AppError(404, 'Variant not found', 'VARIANT_NOT_FOUND');

    const updated = await prisma.$transaction(async (tx) => {
      if (delta < 0) {
        const moved = await tx.productVariant.updateMany({
          where: { id: variant.id, stockQuantity: { gte: -delta } },
          data: { stockQuantity: { increment: delta } },
        });
        if (moved.count === 0) {
          throw new AppError(400, 'Insufficient stock', 'INSUFFICIENT_STOCK');
        }
      } else {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockQuantity: { increment: delta } },
        });
      }
      const row = await tx.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
        select: { id: true, stockQuantity: true },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          actorId,
          type: TX_TYPE[dto.type],
          quantityChange: delta,
          quantityBefore: row.stockQuantity - delta,
          quantityAfter: row.stockQuantity,
          note: dto.note,
        },
      });
      return row;
    });
    await notifyIfLowStock(product.id, variant.id, updated.stockQuantity);
    return {
      productId: product.id,
      variantId: variant.id,
      stockQuantity: updated.stockQuantity,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (delta < 0) {
      const moved = await tx.product.updateMany({
        where: { id: product.id, deletedAt: null, stockQuantity: { gte: -delta } },
        data: { stockQuantity: { increment: delta } },
      });
      if (moved.count === 0) {
        throw new AppError(400, 'Insufficient stock', 'INSUFFICIENT_STOCK');
      }
    } else {
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: { increment: delta } },
      });
    }
    const row = await tx.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { id: true, stockQuantity: true },
    });
    await tx.inventoryTransaction.create({
      data: {
        productId: product.id,
        actorId,
        type: TX_TYPE[dto.type],
        quantityChange: delta,
        quantityBefore: row.stockQuantity - delta,
        quantityAfter: row.stockQuantity,
        note: dto.note,
      },
    });
    return row;
  });
  await notifyIfLowStock(product.id, null, updated.stockQuantity);
  return {
    productId: product.id,
    variantId: null,
    stockQuantity: updated.stockQuantity,
  };
}

export async function upsertStockAlert(dto: UpsertStockAlertDto, actorId: string) {
  const product = await prisma.product.findFirst({
    where: { id: dto.productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');

  if (dto.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: dto.variantId, productId: dto.productId, deletedAt: null },
      select: { id: true },
    });
    if (!variant) throw new AppError(404, 'Variant not found', 'VARIANT_NOT_FOUND');
  }

  const existing = await prisma.stockAlert.findFirst({
    where: {
      productId: dto.productId,
      variantId: dto.variantId ?? null,
    },
  });

  if (existing) {
    return prisma.stockAlert.update({
      where: { id: existing.id },
      data: {
        threshold: dto.threshold,
        isActive: dto.isActive ?? true,
        updatedBy: actorId,
      },
      select: { id: true, productId: true, variantId: true, threshold: true, isActive: true },
    });
  }

  return prisma.stockAlert.create({
    data: {
      productId: dto.productId,
      variantId: dto.variantId,
      threshold: dto.threshold,
      isActive: dto.isActive ?? true,
      createdBy: actorId,
      updatedBy: actorId,
    },
    select: { id: true, productId: true, variantId: true, threshold: true, isActive: true },
  });
}

export async function listTransactions(query: InventoryTxQueryDto) {
  const { page, limit, productId, variantId } = query;
  const skip = (page - 1) * limit;
  const where: Prisma.InventoryTransactionWhereInput = {
    ...(productId && { productId }),
    ...(variantId && { variantId }),
  };

  const [total, items] = await Promise.all([
    prisma.inventoryTransaction.count({ where }),
    prisma.inventoryTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productId: true,
        variantId: true,
        type: true,
        quantityChange: true,
        quantityBefore: true,
        quantityAfter: true,
        note: true,
        createdAt: true,
        actor: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return { items, total, page, limit };
}

export async function notifyIfLowStock(
  productId: string,
  variantId: string | null,
  stockQuantity: number,
) {
  const alert = await prisma.stockAlert.findFirst({
    where: {
      productId,
      variantId,
      isActive: true,
    },
  });
  if (!alert || stockQuantity > alert.threshold) return;

  const cooldownAgo = new Date(Date.now() - ALERT_COOLDOWN_MS);
  if (alert.lastAlertedAt && alert.lastAlertedAt > cooldownAgo) return;

  const staff = await prisma.userRole.findMany({
    where: {
      isActive: true,
      role: { name: { in: [...INVENTORY_ROLES] } },
      user: { isActive: true, deletedAt: null },
    },
    select: { userId: true },
  });
  const userIds = [...new Set(staff.map((row) => row.userId))];
  if (userIds.length === 0) {
    await prisma.stockAlert.update({
      where: { id: alert.id },
      data: { lastAlertedAt: new Date() },
    });
    return;
  }

  const product = await prisma.product.findFirst({
    where: { id: productId },
    select: { sku: true },
  });

  await prisma.$transaction([
    prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: 'stock_alert',
        channel: 'in_app',
        title: 'stock_alert',
        body: 'stock_alert',
        data: {
          productId,
          variantId,
          sku: product?.sku ?? null,
          stockQuantity,
          threshold: alert.threshold,
        } as Prisma.InputJsonValue,
      })),
    }),
    prisma.stockAlert.update({
      where: { id: alert.id },
      data: { lastAlertedAt: new Date() },
    }),
  ]);
}
