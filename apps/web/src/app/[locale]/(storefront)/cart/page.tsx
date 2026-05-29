import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Cart');
  return { title: t('pageTitle') };
}

export default async function CartPage() {
  return (
    <div className="container py-8">
      {/* <CartItemList /> */}
      {/* <CartSummary /> */}
      {/* <CheckoutButton /> */}
    </div>
  );
}
