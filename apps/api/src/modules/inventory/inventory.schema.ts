import { z } from 'zod';
import { INVENTORY_ADJUST_TYPES, INVENTORY_DIRECTIONS } from '../../utils/inventory-delta';

export const InventoryListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  inStock: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  lowStock: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  locale: z.string().min(2).max(10).optional(),
});

export const AdjustStockSchema = z
  .object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    type: z.enum(INVENTORY_ADJUST_TYPES),
    quantity: z.number().int().positive(),
    direction: z.enum(INVENTORY_DIRECTIONS).optional(),
    note: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'adjustment' && !value.direction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adjustment requires direction in or out',
        path: ['direction'],
      });
    }
  });

export const UpsertStockAlertSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  threshold: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

export const InventoryTxQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
});

export type InventoryListQueryDto = z.infer<typeof InventoryListQuery>;
export type AdjustStockDto = z.infer<typeof AdjustStockSchema>;
export type UpsertStockAlertDto = z.infer<typeof UpsertStockAlertSchema>;
export type InventoryTxQueryDto = z.infer<typeof InventoryTxQuery>;
