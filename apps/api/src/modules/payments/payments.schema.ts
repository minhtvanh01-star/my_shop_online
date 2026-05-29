import { z } from 'zod';

export const StripeIntentSchema = z.object({
  orderId: z.string().uuid(),
});

export const VNPayCreateSchema = z.object({
  orderId: z.string().uuid(),
  locale: z.enum(['vn', 'en']).default('vn'),
  bankCode: z.string().optional(),
});

export type StripeIntentDto = z.infer<typeof StripeIntentSchema>;
export type VNPayCreateDto = z.infer<typeof VNPayCreateSchema>;
