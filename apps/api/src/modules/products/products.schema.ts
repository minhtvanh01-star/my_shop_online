import { z } from 'zod';

export const ProductListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  isFeatured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  locale: z.string().default('en'),
  currency: z.string().default('USD'),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
});

export const CreateProductSchema = z.object({
  categoryId: z.string().uuid(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  sku: z.string().min(1),
  basePrice: z.number().positive(),
  currency: z.string().default('USD'),
  stockQuantity: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  attributes: z.record(z.unknown()).optional(),
  translations: z.array(
    z.object({
      locale: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }),
  ).min(1),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const CreateVariantSchema = z.object({
  sku: z.string().min(1),
  optionName: z.string().min(1),
  optionValue: z.string().min(1),
  priceModifier: z.number().default(0),
  stockQuantity: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional(),
});

export type ProductListQueryDto = z.infer<typeof ProductListQuery>;
export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type CreateVariantDto = z.infer<typeof CreateVariantSchema>;
