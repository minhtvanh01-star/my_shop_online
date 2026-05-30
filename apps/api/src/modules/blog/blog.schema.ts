import { z } from 'zod';

export const ListPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});

const PostTranslationSchema = z.object({
  locale: z.string().min(2).max(10),
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const CreatePostSchema = z.object({
  categoryId: z.string().uuid(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  featuredImageUrl: z.string().url().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  isFeatured: z.boolean().default(false),
  translations: z.array(PostTranslationSchema).min(1),
});

export const UpdatePostSchema = z.object({
  categoryId: z.string().uuid().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  featuredImageUrl: z.string().url().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  isFeatured: z.boolean().optional(),
  translations: z.array(PostTranslationSchema).min(1).optional(),
});

export const CreatePostCategorySchema = z.object({
  parentId: z.string().uuid().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ListPostsQueryDto = z.infer<typeof ListPostsQuerySchema>;
export type CreatePostDto = z.infer<typeof CreatePostSchema>;
export type UpdatePostDto = z.infer<typeof UpdatePostSchema>;
export type CreatePostCategoryDto = z.infer<typeof CreatePostCategorySchema>;
