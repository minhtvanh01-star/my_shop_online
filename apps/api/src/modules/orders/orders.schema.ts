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
export type AdminOrderListQueryDto = z.infer<typeof AdminOrderListQuery>;
