import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CheckoutWizard } from '@/components/checkout/CheckoutWizard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Checkout');
  return { title: t('pageTitle') };
}

export default function CheckoutPage() {
  return <CheckoutWizard />;
}
