import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ctaClassName } from '@/lib/brand';
import { productImage, productName, type ApiCategory, type CatalogProduct } from '@/lib/catalog';
import { brand } from '@/lib/brand';
import { serverGet, serverGetPaginated } from '@/lib/server-api';

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const nav = await getTranslations('Nav');

  let featured: CatalogProduct[] = [];
  let categories: ApiCategory[] = [];
  try {
    const [featuredRes, categoryRes] = await Promise.all([
      serverGetPaginated<CatalogProduct>(`/products?isFeatured=true&locale=${locale}&limit=8`),
      serverGet<ApiCategory[]>('/categories'),
    ]);
    featured = featuredRes.data;
    categories = categoryRes;
  } catch {
    featured = [];
    categories = [];
  }

  const heroProduct = featured[0];
  const heroImage = heroProduct ? productImage(heroProduct) : null;

  return (
    <div>
      <section className="relative min-h-[85vh] bg-[#E8F1F3]">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage.url}
            alt={heroImage.alt || productName(heroProduct)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-white px-6 py-8 md:px-12">
          <p className="font-heading text-sm font-semibold tracking-wide text-[#059669]">{brand.name}</p>
          <h1 className="mt-2 max-w-xl font-heading text-4xl font-semibold text-[#064E3B] md:text-5xl">
            {t('hero.heading')}
          </h1>
          <p className="mt-3 max-w-lg text-[#475569]">{t('hero.subheading')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products" className={ctaClassName}>
              {t('hero.cta')}
            </Link>
            <Link href="/blog" className="inline-flex h-11 items-center text-sm text-[#059669] underline-offset-4 hover:underline">
              {nav('blog')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-heading text-2xl text-[#064E3B]">{t('featuredProducts')}</h2>
        <p className="mt-2 text-sm text-[#475569]">{t('newArrivals')}</p>
        {featured.length === 0 ? (
          <p className="mt-8 text-sm text-[#475569]">{nav('products')}</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-heading text-2xl text-[#064E3B]">{t('topCategories')}</h2>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={{ pathname: '/categories/[slug]', params: { slug: category.slug } }}
                className="block py-3 text-[#064E3B] underline-offset-4 hover:text-[#059669] hover:underline"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
