import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin');
  return { title: t('dashboard') };
}

export default async function DashboardPage() {
  return (
    <div>
      {/* <StatsCards /> — revenue, orders, customers, products */}
      {/* <RecentOrdersTable /> */}
      {/* <RevenueChart /> */}
      {/* <TopProductsChart /> */}
    </div>
  );
}
