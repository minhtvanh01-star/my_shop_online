import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Orders');
  return { title: t('pageTitle') };
}

export default async function OrdersPage() {
  return (
    <div className="container py-8">
      {/* <OrderList /> */}
    </div>
  );
}
