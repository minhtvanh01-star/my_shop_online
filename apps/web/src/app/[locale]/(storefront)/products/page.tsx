import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Products');
  return { title: t('pageTitle') };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; sort?: string; q?: string };
}) {
  return (
    <div className="container py-8">
      {/* <ProductFilters /> */}
      {/* <ProductGrid /> */}
      {/* <Pagination /> */}
    </div>
  );
}
