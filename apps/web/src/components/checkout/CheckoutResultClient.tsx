'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';

/** Clears local cart after a confirmed checkout redirect (Stripe / VNPay success). */
export function CheckoutResultClient({ clearOnMount }: { clearOnMount: boolean }) {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    if (clearOnMount) clearCart();
  }, [clearOnMount, clearCart]);

  return null;
}
