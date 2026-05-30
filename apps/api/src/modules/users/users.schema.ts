import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  locale: z.string().min(2).max(10).optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const CreateAddressSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  recipientName: z.string().min(1).max(255),
  phone: z.string().min(1).max(50).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  countryCode: z.string().min(2).max(10),
  isDefault: z.boolean().default(false),
});

export const UpdateAddressSchema = CreateAddressSchema.partial();

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export type CreateAddressDto = z.infer<typeof CreateAddressSchema>;
export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;
