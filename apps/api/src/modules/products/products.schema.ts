import { z } from 'zod';

const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const ProductTypeSchema = z.enum(['simple', 'variable', 'grouped', 'external', 'variation']);

export const ProductListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  isFeatured: boolQuery.optional(),
  isActive: boolQuery.optional(),
  inStock: boolQuery.optional(),
  locale: z.string().default('en'),
  currency: z.string().default('USD'),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
});

const TranslationSchema = z.object({
  locale: z.string(),
  name: z.string().min(1),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

const ProductImageInputSchema = z.object({
  url: z.string().min(1),
  altText: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

const ProductPriceInputSchema = z.object({
  currency: z.string().min(3).max(8),
  amount: z.number().nonnegative(),
  compareAt: z.number().nonnegative().optional(),
  countryCode: z.string().length(2).optional(),
});

const ProductSpecificationInputSchema = z.object({
  locale: z.string().default('vi'),
  name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const CreateVariantSchema = z.object({
  sku: z.string().min(1),
  optionName: z.string().min(1),
  optionValue: z.string().min(1),
  priceModifier: z.number().default(0),
  stockQuantity: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional(),
});

export const CreateProductSchema = z.object({
  categoryId: z.string().uuid(),
  categoryIds: z.array(z.string().uuid()).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  sku: z.string().min(1),
  type: ProductTypeSchema.default('simple'),
  basePrice: z.number().positive(),
  currency: z.string().default('USD'),
  stockQuantity: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(false),
  attributes: z.record(z.unknown()).optional(),
  externalId: z.string().min(1).optional(),
  externalSource: z.string().min(1).optional(),
  importMeta: z.record(z.unknown()).optional(),
  translations: z.array(TranslationSchema).min(1),
  images: z.array(ProductImageInputSchema).optional(),
  prices: z.array(ProductPriceInputSchema).optional(),
  specifications: z.array(ProductSpecificationInputSchema).optional(),
  variants: z.array(CreateVariantSchema).optional(),
});

/** Catalog edits must not overwrite stock; use POST /inventory/adjust (BR-I02). */
export const UpdateProductSchema = CreateProductSchema.partial().omit({ stockQuantity: true });

export type ProductListQueryDto = z.infer<typeof ProductListQuery>;
export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type CreateVariantDto = z.infer<typeof CreateVariantSchema>;
