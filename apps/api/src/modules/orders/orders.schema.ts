import { z } from 'zod';

export const CreateOrderSchema = z.object({
  shippingAddress: z.object({
    recipientName: z.string().min(1),
    phone: z.string().optional(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    countryCode: z.string().length(2),
  }),
  currency: z.string().default('USD'),
  locale: z.string().default('en'),
  couponCode: z.string().optional(),
  shippingMethodId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  trackingNumber: z.string().optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const CreateReturnRequestSchema = z.object({
  type: z.enum(['refund', 'exchange']),
  reason: z.string().min(8).max(1000),
});

export const ReviewReturnRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: z.string().max(1000).optional(),
});

export const UserOrderListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .optional(),
});

export const AdminOrderListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .optional(),
  userId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;
export type CancelOrderDto = z.infer<typeof CancelOrderSchema>;
export type CreateReturnRequestDto = z.infer<typeof CreateReturnRequestSchema>;
export type ReviewReturnRequestDto = z.infer<typeof ReviewReturnRequestSchema>;
export type UserOrderListQueryDto = z.infer<typeof UserOrderListQuery>;
export type AdminOrderListQueryDto = z.infer<typeof AdminOrderListQuery>;
