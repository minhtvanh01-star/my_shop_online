import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { AddToWishlistDto } from './wishlist.schema';

const wishlistItemSelect = {
  id: true,
  productId: true,
  variantId: true,
  createdAt: true,
  product: {
    select: {
      id: true,
      slug: true,
      basePrice: true,
      currency: true,
      isActive: true,
      translations: {
        where: { locale: 'en' },
        select: { name: true, locale: true },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true, altText: true },
      },
    },
  },
  variant: {
    select: {
      id: true,
      optionName: true,
      optionValue: true,
      priceModifier: true,
    },
  },
};

export async function getWishlist(userId: string) {
  return prisma.wishlist.findMany({
    where: { userId },
    select: wishlistItemSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function addToWishlist(userId: string, productId: string, dto: AddToWishlistDto) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new AppError(404, 'Product not found or inactive', 'PRODUCT_NOT_FOUND');

  if (dto.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: dto.variantId, productId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!variant) throw new AppError(404, 'Variant not found', 'VARIANT_NOT_FOUND');
  }

  const variantId = dto.variantId ?? null;

  const existing = await prisma.wishlist.findFirst({
    where: { userId, productId, variantId },
    select: { id: true },
  });
  if (existing) throw new AppError(409, 'Product already in wishlist', 'ALREADY_IN_WISHLIST');

  return prisma.wishlist.create({
    data: { userId, productId, variantId },
    select: wishlistItemSelect,
  });
}

export async function removeFromWishlist(
  userId: string,
  productId: string,
  variantId?: string,
) {
  const resolvedVariantId = variantId ?? null;

  const item = await prisma.wishlist.findFirst({
    where: { userId, productId, variantId: resolvedVariantId },
    select: { id: true },
  });
  if (!item) throw new AppError(404, 'Wishlist item not found', 'WISHLIST_ITEM_NOT_FOUND');

  await prisma.wishlist.delete({ where: { id: item.id } });
}
