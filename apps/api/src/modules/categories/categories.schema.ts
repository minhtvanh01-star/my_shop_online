import { z } from 'zod';

export const CreateCategorySchema = z.object({
  parentId: z.string().uuid().optional(),
  slug: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
