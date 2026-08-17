import { z } from 'zod';

export const AddCartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const SyncCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1),
      }),
    )
    .max(100),
});

export type AddCartItemDto = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItemDto = z.infer<typeof UpdateCartItemSchema>;
export type SyncCartDto = z.infer<typeof SyncCartSchema>;
