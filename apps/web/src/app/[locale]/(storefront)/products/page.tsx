import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { ProductCard } from '@/components/storefront/ProductCard';
import { StorefrontFilterBar } from '@/components/list/StorefrontFilterBar';
import type { ApiCategory, CatalogProduct } from '@/lib/catalog';
import { serverGet, serverGetPaginated } from '@/lib/server-api';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Products');
  return { title: t('pageTitle') };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    category?: string;
    sort?: string;
    q?: string;
    inStock?: string;
    featured?: string;
  };
}) {
  const locale = await getLocale();
  const t = await getTranslations('Products');
  const common = await getTranslations('Common');
  const page = Number(searchParams.page) || 1;
  const sort =
    searchParams.sort === 'price_asc' ||
    searchParams.sort === 'price_desc' ||
    searchParams.sort === 'name_asc'
      ? searchParams.sort
      : 'newest';

  const query = new URLSearchParams({
    locale,
    page: String(page),
    limit: '24',
    sort,
  });
  if (searchParams.q) query.set('search', searchParams.q);
  if (searchParams.category) query.set('categoryId', searchParams.category);
  if (searchParams.inStock === 'true' || searchParams.inStock === 'false') {
    query.set('inStock', searchParams.inStock);
  }
  if (searchParams.featured === 'true') query.set('isFeatured', 'true');

  let items: CatalogProduct[] = [];
  let totalPages = 1;
  let total = 0;
  let categories: ApiCategory[] = [];

  try {
    const [result, categoryTree] = await Promise.all([
      serverGetPaginated<CatalogProduct>(`/products?${query.toString()}`),
      serverGet<ApiCategory[]>('/categories'),
    ]);
    items = result.data;
    totalPages = result.meta.totalPages;
    total = result.meta.total;
    categories = categoryTree;
  } catch {
    items = [];
  }

  const pageQuery = (nextPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set('q', searchParams.q);
    if (searchParams.category) params.set('category', searchParams.category);
    if (searchParams.inStock) params.set('inStock', searchParams.inStock);
    if (searchParams.featured) params.set('featured', searchParams.featured);
    params.set('sort', sort);
    params.set('page', String(nextPage));
    return `?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
      <p className="mt-2 text-sm text-[#475569]">
        {total > 0 ? t('resultsCount', { count: total }) : null}
      </p>

      <StorefrontFilterBar
        searchParams={searchParams}
        categories={categories}
        sortOptions={[
          { value: 'newest', labelKey: t('sortOptions.newest') },
          { value: 'name_asc', labelKey: t('sortOptions.nameAsc') },
          { value: 'price_asc', labelKey: t('sortOptions.priceAsc') },
          { value: 'price_desc', labelKey: t('sortOptions.priceDesc') },
        ]}
        showCategory
        showInStock
        showFeatured
        searchPlaceholder={t('searchPlaceholder')}
        sortLabel={t('sortBy')}
        filterTitle={t('filter.title')}
        categoryLabel={t('filter.category')}
        inStockLabel={t('filter.inStock')}
        featuredLabel={t('filter.featured')}
        allCategoriesLabel={t('filter.allCategories')}
        allLabel={t('filter.all')}
        yesLabel={t('filter.yes')}
        noLabel={t('filter.no')}
      />

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
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label={common('pagination')}>
          {page > 1 ? (
            <a
              href={pageQuery(page - 1)}
              className="inline-flex h-11 items-center border border-[#E2E8F0] bg-white px-4 text-sm text-[#064E3B] hover:border-[#059669]"
            >
              {common('previous')}
            </a>
          ) : null}
          <span className="px-3 text-sm text-[#475569]">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <a
              href={pageQuery(page + 1)}
              className="inline-flex h-11 items-center border border-[#E2E8F0] bg-white px-4 text-sm text-[#064E3B] hover:border-[#059669]"
            >
              {common('next')}
            </a>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
