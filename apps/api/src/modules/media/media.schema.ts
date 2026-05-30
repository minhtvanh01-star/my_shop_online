import { z } from 'zod';

export const MediaQuerySchema = z.object({
  page: z.string().optional().transform((v) => Math.max(1, Number(v) || 1)),
  limit: z.string().optional().transform((v) => Math.min(100, Math.max(1, Number(v) || 20))),
  folder: z.string().optional(),
  mimeType: z.string().optional(),
});

export type MediaQueryDto = z.infer<typeof MediaQuerySchema>;

export const DeleteMediaSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteMediaDto = z.infer<typeof DeleteMediaSchema>;
