import { z } from 'zod';

const PageTranslationSchema = z.object({
  locale: z.string().min(2).max(10),
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const CreatePageSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  showInNav: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  translations: z.array(PageTranslationSchema).min(1),
});

export const UpdatePageSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  showInNav: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  translations: z.array(PageTranslationSchema).min(1).optional(),
});

export type CreatePageDto = z.infer<typeof CreatePageSchema>;
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>;
