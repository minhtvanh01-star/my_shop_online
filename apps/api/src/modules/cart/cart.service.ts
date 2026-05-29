import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { AddCartItemDto, UpdateCartItemDto } from './cart.schema';

const cartItemSelect = {
  id: true,
  quantity: true,
  product: {
    select: {
      id: true,
      slug: true,
      basePrice: true,
      currency: true,
      stockQuantity: true,
      translations: { where: { locale: 'en' }, select: { name: true } },
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
};

export async function getCart(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    select: cartItemSelect,
    orderBy: { createdAt: 'asc' },
  });
}

export async function addItem(userId: string, dto: AddCartItemDto) {
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

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + dto.quantity },
      select: cartItemSelect,
    });
  }

  return prisma.cartItem.create({
    data: { userId, productId: dto.productId, variantId: dto.variantId, quantity: dto.quantity },
    select: cartItemSelect,
  });
}

export async function updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new AppError(404, 'Cart item not found', 'NOT_FOUND');

  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: dto.quantity },
    select: cartItemSelect,
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
