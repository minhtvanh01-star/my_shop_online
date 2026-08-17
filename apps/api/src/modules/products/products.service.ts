import { Prisma, type Prisma as PrismaTypes } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type {
  CreateProductDto,
  CreateVariantDto,
  ProductListQueryDto,
  UpdateProductDto,
} from './products.schema';

export async function listProducts(query: ProductListQueryDto) {
  const { page, limit, search, categoryId, minPrice, maxPrice, isFeatured, locale, currency, sort } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
    ...(categoryId && { categoryId }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(search && {
      translations: {
        some: { locale, name: { contains: search, mode: 'insensitive' } },
      },
    }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { basePrice: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc' ? { basePrice: 'asc' }
    : sort === 'price_desc' ? { basePrice: 'desc' }
    : sort === 'name_asc' ? { translations: { _count: 'asc' } }
    : { createdAt: 'desc' };

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        slug: true,
        sku: true,
        basePrice: true,
        currency: true,
        stockQuantity: true,
        isFeatured: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
        translations: { where: { locale }, select: { name: true, description: true } },
        category: { select: { id: true, slug: true, name: true } },
      },
    }),
  ]);

  return { items, total, page, limit };
}

export async function getProductBySlug(slug: string, locale: string = 'en') {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      translations: { where: { locale } },
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { isActive: true, deletedAt: null }, orderBy: { createdAt: 'asc' } },
      category: { select: { id: true, slug: true, name: true } },
      prices: true,
    },
  });
  if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
  return product;
}

/** Admin: load by UUID including inactive products (soft-deleted still 404). */
export async function getAdminProductById(id: string, locale: string = 'en') {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      translations: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      category: { select: { id: true, slug: true, name: true } },
      prices: true,
    },
  });
  if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
  // Prefer requested locale first in translations array for UI convenience
  const translations = [...product.translations].sort((a, b) =>
    a.locale === locale ? -1 : b.locale === locale ? 1 : 0,
  );
  return { ...product, translations };
}

export async function createProduct(dto: CreateProductDto, createdBy: string) {
  const { translations, ...productData } = dto;

  const existing = await prisma.product.findFirst({
    where: { OR: [{ slug: productData.slug }, { sku: productData.sku }] },
  });
  if (existing) throw new AppError(409, 'Product slug or SKU already exists', 'DUPLICATE');

  return prisma.product.create({
    data: {
      categoryId: productData.categoryId,
      slug: productData.slug,
      sku: productData.sku,
      basePrice: productData.basePrice,
      currency: productData.currency ?? 'USD',
      stockQuantity: productData.stockQuantity ?? 0,
      isFeatured: productData.isFeatured ?? false,
      attributes: (productData.attributes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      createdBy,
      translations: { create: translations },
    },
    include: { translations: true },
  });
}

export async function updateProduct(id: string, dto: UpdateProductDto, updatedBy: string) {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError(404, 'Product not found', 'NOT_FOUND');

  const { translations, ...productData } = dto;

  return prisma.product.update({
    where: { id },
    data: {
      ...(productData.categoryId && { categoryId: productData.categoryId }),
      ...(productData.slug && { slug: productData.slug }),
      ...(productData.sku && { sku: productData.sku }),
      ...(productData.basePrice !== undefined && { basePrice: productData.basePrice }),
      ...(productData.currency && { currency: productData.currency }),
      ...(productData.stockQuantity !== undefined && { stockQuantity: productData.stockQuantity }),
      ...(productData.isFeatured !== undefined && { isFeatured: productData.isFeatured }),
      ...(productData.attributes !== undefined && {
        attributes: (productData.attributes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      }),
      updatedBy,
      ...(translations && {
        translations: { deleteMany: {}, create: translations },
      }),
    },
    include: { translations: true },
  });
}

export async function deleteProduct(id: string, deletedBy: string) {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError(404, 'Product not found', 'NOT_FOUND');

  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy, isActive: false },
  });
}

export async function listAdminProducts(query: ProductListQueryDto) {
  const { page, limit, search, categoryId, minPrice, maxPrice, isFeatured, locale, sort } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(categoryId && { categoryId }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(search && {
      translations: {
        some: { locale, name: { contains: search, mode: 'insensitive' } },
      },
    }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { basePrice: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc' ? { basePrice: 'asc' }
    : sort === 'price_desc' ? { basePrice: 'desc' }
    : { createdAt: 'desc' };

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        slug: true,
        sku: true,
        basePrice: true,
        currency: true,
        stockQuantity: true,
        isActive: true,
        isFeatured: true,
        createdAt: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
        translations: { where: { locale }, select: { name: true } },
        category: { select: { id: true, slug: true, name: true } },
      },
    }),
  ]);

  return { items, total, page, limit };
}

export async function toggleProductActive(id: string, isActive: boolean, updatedBy: string) {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');

  if (isActive) {
    const imageCount = await prisma.productImage.count({ where: { productId: id } });
    if (imageCount === 0) {
      throw new AppError(400, 'Product must have at least one image before activation', 'PRODUCT_NO_IMAGE');
    }
  }

  return prisma.product.update({
    where: { id },
    data: { isActive, updatedBy },
    select: { id: true, slug: true, sku: true, isActive: true },
  });
}

export async function getProductVariants(productId: string) {
  return prisma.productVariant.findMany({
    where: { productId, isActive: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createVariant(productId: string, dto: CreateVariantDto, createdBy: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');

  const existing = await prisma.productVariant.findFirst({ where: { sku: dto.sku } });
  if (existing) throw new AppError(409, 'Variant SKU already exists', 'DUPLICATE');

  return prisma.productVariant.create({ data: { productId, ...dto, createdBy } });
}
