import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/storefront/ProductCard';
import type { ApiCategory, CatalogProduct } from '@/lib/catalog';
import { serverGet, serverGetPaginated } from '@/lib/server-api';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const category = await serverGet<ApiCategory>(`/categories/${params.slug}`);
    return { title: category.name };
  } catch {
    return { title: params.slug };
  }
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const locale = await getLocale();
  let category: ApiCategory;
  try {
    category = await serverGet<ApiCategory>(`/categories/${params.slug}`);
  } catch {
    notFound();
  }

  let items: CatalogProduct[] = [];
  try {
    const result = await serverGetPaginated<CatalogProduct>(
      `/products?locale=${locale}&categoryId=${category.id}&limit=24`,
    );
    items = result.data;
  } catch {
    items = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{category.name}</h1>
      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </div>
  );
}
