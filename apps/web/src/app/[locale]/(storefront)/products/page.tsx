import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { ProductCard } from '@/components/storefront/ProductCard';
import type { CatalogProduct } from '@/lib/catalog';
import { serverGetPaginated } from '@/lib/server-api';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Products');
  return { title: t('pageTitle') };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; sort?: string; q?: string };
}) {
  const locale = await getLocale();
  const t = await getTranslations('Products');
  const common = await getTranslations('Common');
  const page = Number(searchParams.page) || 1;
  const sort = searchParams.sort === 'price_asc' || searchParams.sort === 'price_desc' ? searchParams.sort : 'newest';
  const query = new URLSearchParams({
    locale,
    page: String(page),
    limit: '24',
    sort,
  });
  if (searchParams.q) query.set('search', searchParams.q);
  if (searchParams.category) query.set('categoryId', searchParams.category);

  let items: CatalogProduct[] = [];
  let totalPages = 1;
  try {
    const result = await serverGetPaginated<CatalogProduct>(`/products?${query.toString()}`);
    items = result.data;
    totalPages = result.meta.totalPages;
  } catch {
    items = [];
  }

  const pageQuery = (nextPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set('q', searchParams.q);
    if (searchParams.category) params.set('category', searchParams.category);
    params.set('sort', sort);
    params.set('page', String(nextPage));
    return `?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <label className="sr-only" htmlFor="q">
          {t('filter.title')}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={searchParams.q ?? ''}
          className="h-11 flex-1 border border-[#E2E8F0] px-3"
        />
        <label className="sr-only" htmlFor="sort">
          {t('sortBy')}
        </label>
        <select id="sort" name="sort" defaultValue={sort} className="h-11 border border-[#E2E8F0] px-3">
          <option value="newest">{t('sortOptions.newest')}</option>
          <option value="price_asc">{t('sortOptions.priceAsc')}</option>
          <option value="price_desc">{t('sortOptions.priceDesc')}</option>
        </select>
        <button type="submit" className="h-11 cursor-pointer bg-[#059669] px-4 text-white">
          {t('filter.title')}
        </button>
      </form>
      {items.length === 0 ? (
        <p className="mt-10 text-sm text-[#475569]">{common('noResults')}</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      )}
      {totalPages > 1 ? (
        <div className="mt-10 flex gap-3">
          {page > 1 ? <a href={pageQuery(page - 1)}>{page - 1}</a> : null}
          <span>{page}</span>
          {page < totalPages ? <a href={pageQuery(page + 1)}>{page + 1}</a> : null}
        </div>
      ) : null}
    </div>
  );
}
