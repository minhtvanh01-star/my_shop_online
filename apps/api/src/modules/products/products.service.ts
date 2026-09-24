import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type {
  CreateProductDto,
  CreateVariantDto,
  ImportWooCsvDto,
  ProductListQueryDto,
  UpdateProductDto,
} from './products.schema';
import { csvRowsToObjects, parseCsv } from '../../utils/csv';
import { slugify } from '../../utils/slug';
import {
  mapWooCsvRow,
  WOO_EXTERNAL_SOURCE,
  WOO_IMPORT_NOTE,
  type WooMappedProduct,
} from '../../utils/woo-product-csv';

function productSearchFilter(search: string, locale: string): Prisma.ProductWhereInput {
  return {
    OR: [
      { sku: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      {
        translations: {
          some: { locale, name: { contains: search, mode: 'insensitive' } },
        },
      },
    ],
  };
}

function productOrderBy(sort: ProductListQueryDto['sort']): Prisma.ProductOrderByWithRelationInput {
  if (sort === 'price_asc') return { basePrice: 'asc' };
  if (sort === 'price_desc') return { basePrice: 'desc' };
  if (sort === 'name_asc') return { slug: 'asc' };
  return { createdAt: 'desc' };
}

function categoryWhere(categoryId?: string): Prisma.ProductWhereInput {
  if (!categoryId) return {};
  return {
    OR: [
      { categoryId },
      { productCategories: { some: { categoryId } } },
    ],
  };
}

function uniqueCategoryIds(primaryId: string, extraIds: string[] = []): string[] {
  return [primaryId, ...extraIds.filter((id) => id !== primaryId)];
}

function categoryCreateRows(primaryId: string, extraIds: string[] = []) {
  return uniqueCategoryIds(primaryId, extraIds).map((categoryId, index) => ({
    categoryId,
    isPrimary: categoryId === primaryId,
    sortOrder: index,
  }));
}

function imageCreateRows(images: NonNullable<CreateProductDto['images']>) {
  const hasPrimary = images.some((image) => image.isPrimary);
  return images.map((image, index) => ({
    url: image.url,
    altText: image.altText,
    sortOrder: image.sortOrder ?? index,
    isPrimary: hasPrimary ? Boolean(image.isPrimary) : index === 0,
  }));
}

const productDetailInclude = {
  translations: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' as const } },
  category: { select: { id: true, slug: true, name: true } },
  prices: true,
  productCategories: {
    orderBy: { sortOrder: 'asc' as const },
    include: { category: { select: { id: true, slug: true, name: true } } },
  },
  specifications: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProductInclude;

export async function listProducts(query: ProductListQueryDto) {
  const { page, limit, search, categoryId, minPrice, maxPrice, isFeatured, inStock, locale, sort } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
    ...categoryWhere(categoryId),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(inStock === true && { stockQuantity: { gt: 0 } }),
    ...(inStock === false && { stockQuantity: { lte: 0 } }),
    ...(search && productSearchFilter(search, locale)),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { basePrice: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
      : {}),
  };

  const orderBy = productOrderBy(sort);

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
        translations: { where: { locale }, select: { name: true, shortDescription: true, description: true } },
        category: { select: { id: true, slug: true, name: true } },
        productCategories: {
          orderBy: { sortOrder: 'asc' },
          include: { category: { select: { id: true, slug: true, name: true } } },
        },
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
      productCategories: {
        orderBy: { sortOrder: 'asc' },
        include: { category: { select: { id: true, slug: true, name: true } } },
      },
      specifications: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
  const localeSpecs = product.specifications.filter((row) => row.locale === locale);
  const specifications =
    localeSpecs.length > 0 ? localeSpecs : product.specifications.filter((row) => row.locale === 'vi');
  return { ...product, specifications };
}

/** Admin: load by UUID including inactive products (soft-deleted still 404). */
export async function getAdminProductById(id: string, locale: string = 'en') {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: productDetailInclude,
  });
  if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
  // Prefer requested locale first in translations array for UI convenience
  const translations = [...product.translations].sort((a, b) =>
    a.locale === locale ? -1 : b.locale === locale ? 1 : 0,
  );
  return { ...product, translations };
}

export async function createProduct(dto: CreateProductDto, createdBy: string) {
  const {
    translations,
    categoryIds,
    images,
    prices,
    specifications,
    variants,
    attributes,
    importMeta,
    ...productData
  } = dto;

  const existing = await prisma.product.findFirst({
    where: { OR: [{ slug: productData.slug }, { sku: productData.sku }] },
  });
  if (existing) throw new AppError(409, 'Product slug or SKU already exists', 'DUPLICATE');

  if (productData.externalId && productData.externalSource) {
    const duplicateExternal = await prisma.product.findFirst({
      where: {
        externalId: productData.externalId,
        externalSource: productData.externalSource,
        deletedAt: null,
      },
    });
    if (duplicateExternal) {
      throw new AppError(409, 'Imported product already exists', 'DUPLICATE_EXTERNAL');
    }
  }

  return prisma.product.create({
    data: {
      categoryId: productData.categoryId,
      slug: productData.slug,
      sku: productData.sku,
      type: productData.type ?? 'simple',
      basePrice: productData.basePrice,
      currency: productData.currency ?? 'USD',
      stockQuantity: productData.stockQuantity ?? 0,
      isFeatured: productData.isFeatured ?? false,
      isActive: Boolean(productData.isActive) && Boolean(images?.length),
      attributes: (attributes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      externalId: productData.externalId,
      externalSource: productData.externalSource,
      importMeta: (importMeta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      createdBy,
      translations: { create: translations },
      productCategories: { create: categoryCreateRows(productData.categoryId, categoryIds) },
      ...(images?.length ? { images: { create: imageCreateRows(images) } } : {}),
      ...(prices?.length
        ? {
            prices: {
              create: prices.map((price) => ({
                currency: price.currency,
                amount: price.amount,
                compareAt: price.compareAt,
                countryCode: price.countryCode,
              })),
            },
          }
        : {}),
      ...(specifications?.length ? { specifications: { create: specifications } } : {}),
      ...(variants?.length
        ? {
            variants: {
              create: variants.map((variant) => ({
                sku: variant.sku,
                optionName: variant.optionName,
                optionValue: variant.optionValue,
                priceModifier: variant.priceModifier ?? 0,
                stockQuantity: variant.stockQuantity ?? 0,
                imageUrl: variant.imageUrl,
                createdBy,
              })),
            },
          }
        : {}),
    },
    include: productDetailInclude,
  });
}

export async function updateProduct(id: string, dto: UpdateProductDto, updatedBy: string) {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError(404, 'Product not found', 'NOT_FOUND');

  const {
    translations,
    categoryIds,
    images,
    prices,
    specifications,
    variants: _variants,
    attributes,
    importMeta,
    ...productData
  } = dto;

  const nextCategoryId = productData.categoryId ?? existing.categoryId;

  return prisma.product.update({
    where: { id },
    data: {
      ...(productData.categoryId && { categoryId: productData.categoryId }),
      ...(productData.slug && { slug: productData.slug }),
      ...(productData.sku && { sku: productData.sku }),
      ...(productData.type && { type: productData.type }),
      ...(productData.basePrice !== undefined && { basePrice: productData.basePrice }),
      ...(productData.currency && { currency: productData.currency }),
      ...(productData.isFeatured !== undefined && { isFeatured: productData.isFeatured }),
      ...(productData.isActive !== undefined && { isActive: productData.isActive }),
      ...(productData.externalId !== undefined && { externalId: productData.externalId }),
      ...(productData.externalSource !== undefined && { externalSource: productData.externalSource }),
      ...(attributes !== undefined && {
        attributes: (attributes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      }),
      ...(importMeta !== undefined && {
        importMeta: (importMeta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      }),
      updatedBy,
      ...(translations && {
        translations: { deleteMany: {}, create: translations },
      }),
      ...(categoryIds && {
        productCategories: {
          deleteMany: {},
          create: categoryCreateRows(nextCategoryId, categoryIds),
        },
      }),
      ...(images && {
        images: { deleteMany: {}, create: imageCreateRows(images) },
      }),
      ...(prices && {
        prices: {
          deleteMany: {},
          create: prices.map((price) => ({
            currency: price.currency,
            amount: price.amount,
            compareAt: price.compareAt,
            countryCode: price.countryCode,
          })),
        },
      }),
      ...(specifications && {
        specifications: { deleteMany: {}, create: specifications },
      }),
    },
    include: productDetailInclude,
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
  const { page, limit, search, categoryId, minPrice, maxPrice, isFeatured, isActive, inStock, locale, sort } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...categoryWhere(categoryId),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(isActive !== undefined && { isActive }),
    ...(inStock === true && { stockQuantity: { gt: 0 } }),
    ...(inStock === false && { stockQuantity: { lte: 0 } }),
    ...(search && productSearchFilter(search, locale)),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { basePrice: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
      : {}),
  };

  const orderBy = productOrderBy(sort);

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
        type: true,
        isActive: true,
        isFeatured: true,
        createdAt: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
        translations: { where: { locale }, select: { name: true } },
        category: { select: { id: true, slug: true, name: true } },
        _count: { select: { variants: true } },
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

type ImportSkip = { externalId: string; name: string; reason: string };

async function uniqueProductSlug(base: string, exceptId?: string): Promise<string> {
  const root = base || 'product';
  let slug = root;
  let n = 1;
  while (
    await prisma.product.findFirst({
      where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${root.slice(0, 70)}-${n}`;
    n += 1;
  }
  return slug;
}

async function uniqueProductSku(base: string, exceptId?: string): Promise<string> {
  const root = base || 'SKU';
  let sku = root;
  let n = 1;
  while (
    await prisma.product.findFirst({
      where: { sku, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    })
  ) {
    sku = `${root.slice(0, 40)}-${n}`;
    n += 1;
  }
  return sku;
}

async function uniqueCategorySlug(base: string): Promise<string> {
  const root = base || 'category';
  let slug = root;
  let n = 1;
  while (await prisma.category.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${root.slice(0, 70)}-${n}`;
    n += 1;
  }
  return slug;
}

async function ensureCategoryPath(parts: string[], actorId: string): Promise<string> {
  let parentId: string | null = null;
  let lastId = '';
  for (const name of parts) {
    const existing: { id: string } | null = await prisma.category.findFirst({
      where: { name, parentId, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      lastId = existing.id;
      parentId = existing.id;
      continue;
    }
    const slug = await uniqueCategorySlug(slugify(name) || 'category');
    const created: { id: string } = await prisma.category.create({
      data: {
        name,
        slug,
        parentId,
        isActive: true,
        createdBy: actorId,
      },
      select: { id: true },
    });
    lastId = created.id;
    parentId = created.id;
  }
  return lastId;
}

async function resolveImportCategories(mapped: WooMappedProduct, actorId: string) {
  const leafIds: string[] = [];
  for (const path of mapped.categoryPaths) {
    leafIds.push(await ensureCategoryPath(path, actorId));
  }
  if (leafIds.length === 0) {
    leafIds.push(await ensureCategoryPath(['Sản phẩm'], actorId));
  }
  const unique = [...new Set(leafIds)];
  return { categoryId: unique[0], categoryIds: unique };
}

function importPrices(mapped: WooMappedProduct, currency: string) {
  const basePrice = mapped.salePrice ?? mapped.regularPrice;
  if (!basePrice) return null;
  const compareAt =
    mapped.regularPrice && mapped.salePrice && mapped.regularPrice > mapped.salePrice
      ? mapped.regularPrice
      : undefined;
  return { basePrice, compareAt, currency };
}

export async function importWooCsv(dto: ImportWooCsvDto, actorId: string) {
  const rows = csvRowsToObjects(parseCsv(dto.csv));
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: ImportSkip[] = [];

  for (const row of rows) {
    const mapped = mapWooCsvRow(row);
    if (!mapped) {
      skipped.push({ externalId: row.ID || '', name: row.Tên || '', reason: 'missing_id_or_name' });
      continue;
    }
    const prices = importPrices(mapped, dto.currency);
    if (!prices) {
      skipped.push({ externalId: mapped.externalId, name: mapped.name, reason: 'missing_price' });
      continue;
    }

    const existing = await prisma.product.findFirst({
      where: {
        externalSource: WOO_EXTERNAL_SOURCE,
        externalId: mapped.externalId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing && !dto.updateExisting) {
      skipped.push({ externalId: mapped.externalId, name: mapped.name, reason: 'already_imported' });
      continue;
    }

    const { categoryId, categoryIds } = await resolveImportCategories(mapped, actorId);
    const slug = await uniqueProductSlug(mapped.slug, existing?.id);
    const sku = await uniqueProductSku(mapped.sku, existing?.id);
    const images = mapped.imageUrls.map((url, index) => ({
      url,
      altText: mapped.name,
      sortOrder: index,
      isPrimary: index === 0,
    }));
    const translations = [
      {
        locale: 'vi',
        name: mapped.name,
        shortDescription: mapped.shortDescription || undefined,
        description: mapped.description || undefined,
      },
      {
        locale: 'en',
        name: mapped.name,
        shortDescription: mapped.shortDescription || undefined,
        description: mapped.description || undefined,
      },
    ];
    const importMeta = {
      note: WOO_IMPORT_NOTE,
      source: WOO_EXTERNAL_SOURCE,
    };

    if (existing) {
      await updateProduct(
        existing.id,
        {
          categoryId,
          categoryIds,
          slug,
          sku,
          type: mapped.type,
          basePrice: prices.basePrice,
          currency: prices.currency,
          isActive: dto.publish && images.length > 0 ? true : undefined,
          attributes: { catalogNote: WOO_IMPORT_NOTE },
          externalId: mapped.externalId,
          externalSource: WOO_EXTERNAL_SOURCE,
          importMeta,
          translations,
          images,
          prices: [
            {
              currency: prices.currency,
              amount: prices.basePrice,
              compareAt: prices.compareAt,
            },
          ],
          specifications: [],
        },
        actorId,
      );
      updated.push(existing.id);
      continue;
    }

    const product = await createProduct(
      {
        categoryId,
        categoryIds,
        slug,
        sku,
        type: mapped.type,
        basePrice: prices.basePrice,
        currency: prices.currency,
        stockQuantity: dto.defaultStock,
        isFeatured: false,
        isActive: dto.publish && images.length > 0,
        attributes: { catalogNote: WOO_IMPORT_NOTE },
        externalId: mapped.externalId,
        externalSource: WOO_EXTERNAL_SOURCE,
        importMeta,
        translations,
        images,
        prices: [
          {
            currency: prices.currency,
            amount: prices.basePrice,
            compareAt: prices.compareAt,
          },
        ],
        specifications: [],
        variants: [],
      },
      actorId,
    );
    created.push(product.id);
  }

  return {
    created: created.length,
    updated: updated.length,
    skipped: skipped.length,
    createdIds: created,
    updatedIds: updated,
    skippedRows: skipped,
    note: WOO_IMPORT_NOTE,
  };
}
