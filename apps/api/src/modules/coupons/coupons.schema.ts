import { z } from 'zod';

export const CouponListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const CreateCouponSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .transform((s) => s.trim().toUpperCase()),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minOrderAmount: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  applicableCountries: z.array(z.string().length(2)).default([]),
  startDate: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateCouponSchema = CreateCouponSchema.partial();

export type CouponListQueryDto = z.infer<typeof CouponListQuery>;
export type CreateCouponDto = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponDto = z.infer<typeof UpdateCouponSchema>;
