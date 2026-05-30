import { z } from 'zod';

export const AddToWishlistSchema = z.object({
  variantId: z.string().uuid().optional(),
});

export const RemoveFromWishlistQuerySchema = z.object({
  variantId: z.string().uuid().optional(),
});

export type AddToWishlistDto = z.infer<typeof AddToWishlistSchema>;
export type RemoveFromWishlistQuery = z.infer<typeof RemoveFromWishlistQuerySchema>;
