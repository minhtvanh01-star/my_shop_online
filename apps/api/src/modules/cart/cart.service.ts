import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { resolveLocale } from '../../utils/locale';
import type { AddCartItemDto, SyncCartDto, UpdateCartItemDto } from './cart.schema';

function cartItemSelect(locale: string) {
  const resolved = resolveLocale(locale);
  return {
    id: true,
    quantity: true,
    product: {
      select: {
        id: true,
        slug: true,
        basePrice: true,
        currency: true,
        stockQuantity: true,
        translations: { where: { locale: resolved }, select: { name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
      },
    },
    variant: {
      select: {
        id: true,
        optionName: true,
        optionValue: true,
        priceModifier: true,
        stockQuantity: true,
      },
    },
  } as const;
}

export async function getCart(userId: string, locale = 'en') {
  return prisma.cartItem.findMany({
    where: { userId },
    select: cartItemSelect(locale),
    orderBy: { createdAt: 'asc' },
  });
}

async function assertStock(productId: string, variantId: string | undefined, quantity: number) {
  if (variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, isActive: true },
      select: { stockQuantity: true },
    });
    if (!variant) throw new AppError(404, 'Variant not found', 'NOT_FOUND');
    if (quantity > variant.stockQuantity) {
      throw new AppError(400, 'Insufficient stock', 'INSUFFICIENT_STOCK');
    }
    return;
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, deletedAt: null },
    select: { stockQuantity: true },
  });
  if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
  if (quantity > product.stockQuantity) {
    throw new AppError(400, 'Insufficient stock', 'INSUFFICIENT_STOCK');
  }
}

export async function addItem(userId: string, dto: AddCartItemDto, locale = 'en') {
  const product = await prisma.product.findFirst({
    where: { id: dto.productId, isActive: true, deletedAt: null },
  });
  if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');

  if (dto.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: dto.variantId, productId: dto.productId, isActive: true },
    });
    if (!variant) throw new AppError(404, 'Variant not found', 'NOT_FOUND');
  }

  const existing = await prisma.cartItem.findFirst({
    where: { userId, productId: dto.productId, variantId: dto.variantId ?? null },
  });
  const nextQty = (existing?.quantity ?? 0) + dto.quantity;
  await assertStock(dto.productId, dto.variantId, nextQty);

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
      select: cartItemSelect(locale),
    });
  }

  return prisma.cartItem.create({
    data: { userId, productId: dto.productId, variantId: dto.variantId, quantity: dto.quantity },
    select: cartItemSelect(locale),
  });
}

export async function updateItem(userId: string, itemId: string, dto: UpdateCartItemDto, locale = 'en') {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new AppError(404, 'Cart item not found', 'NOT_FOUND');
  await assertStock(item.productId, item.variantId ?? undefined, dto.quantity);

  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: dto.quantity },
    select: cartItemSelect(locale),
  });
}

export async function removeItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new AppError(404, 'Cart item not found', 'NOT_FOUND');

  await prisma.cartItem.delete({ where: { id: itemId } });
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

export async function syncCart(userId: string, dto: SyncCartDto, locale = 'en') {
  for (const item of dto.items) {
    await addItem(userId, item, locale);
  }
  return getCart(userId, locale);
}
