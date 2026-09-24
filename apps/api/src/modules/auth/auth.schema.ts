import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  locale: z.string().default('en'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /** customer = storefront; staff = admin portal (rejects CUSTOMER role) */
  portal: z.enum(['customer', 'staff']).default('customer'),
});

export const GoogleLoginSchema = z.object({
  idToken: z.string().min(1),
  portal: z.enum(['customer', 'staff']).default('customer'),
  locale: z.string().min(2).max(10).optional(),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const OtpCode = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  code: OtpCode,
  password: z.string().min(8),
});

export const VerifyEmailSchema = z.object({
  email: z.string().email(),
  code: OtpCode,
});

export const ResendVerificationSchema = z.object({
  email: z.string().email(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type GoogleLoginDto = z.infer<typeof GoogleLoginSchema>;
export type RefreshDto = z.infer<typeof RefreshSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;
