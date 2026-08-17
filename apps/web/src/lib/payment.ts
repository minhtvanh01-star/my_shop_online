export type CheckoutPaymentMethod = 'stripe' | 'vnpay' | 'cod';

export function vnpayLocale(locale: string): 'vn' | 'en' {
  return locale.startsWith('vi') ? 'vn' : 'en';
}

export function paymentMethodsForLocale(locale: string): CheckoutPaymentMethod[] {
  if (locale.startsWith('vi')) return ['vnpay', 'stripe', 'cod'];
  return ['stripe'];
}

export function stripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
}
