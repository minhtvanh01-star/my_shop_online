'use client';

import { Header } from '@/components/storefront/Header';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { useServerCart } from '@/hooks/useCart';

export function StorefrontChrome({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  useServerCart();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">{children}</main>
      {footer}
      <CartDrawer />
    </div>
  );
}
