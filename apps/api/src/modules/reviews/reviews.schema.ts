import { z } from 'zod';

export const ListReviewsQuerySchema = z.object({
  productId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateReviewSchema = z.object({
  productId: z.string().uuid(),
  orderItemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(255).optional(),
  body: z.string().min(1).optional(),
});

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(255).optional(),
  body: z.string().min(1).optional(),
});

export const ApproveReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectedReason: z.string().min(1).optional(),
});

export type ListReviewsQueryDto = z.infer<typeof ListReviewsQuerySchema>;
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;
export type ApproveReviewDto = z.infer<typeof ApproveReviewSchema>;
