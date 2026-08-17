import { z } from 'zod';

export const StripeIntentSchema = z.object({
  orderId: z.string().uuid(),
});

export const VNPayCreateSchema = z.object({
  orderId: z.string().uuid(),
  locale: z.enum(['vn', 'en']).default('vn'),
  bankCode: z.string().optional(),
});

export const CodCreateSchema = z.object({
  orderId: z.string().uuid(),
});

export const RefundPaymentSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type StripeIntentDto = z.infer<typeof StripeIntentSchema>;
export type VNPayCreateDto = z.infer<typeof VNPayCreateSchema>;
export type CodCreateDto = z.infer<typeof CodCreateSchema>;
export type RefundPaymentDto = z.infer<typeof RefundPaymentSchema>;
