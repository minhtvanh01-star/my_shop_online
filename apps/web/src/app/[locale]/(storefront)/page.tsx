import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CategoryCard } from '@/components/storefront/CategoryCard';
import { ProductCard } from '@/components/storefront/ProductCard';
import { SectionHeader } from '@/components/storefront/SectionHeader';
import { TrustBar } from '@/components/storefront/TrustBar';
import { ctaClassName } from '@/lib/brand';
import { productImage, productName, type ApiCategory, type CatalogProduct } from '@/lib/catalog';
import { brand } from '@/lib/brand';
import { serverGet, serverGetPaginated } from '@/lib/server-api';

type BlogPost = {
  id: string;
  slug: string;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  translations: { locale: string; title: string; excerpt?: string | null }[];
};

function postTitle(post: BlogPost, locale: string) {
  return post.translations.find((row) => row.locale === locale)?.title
    ?? post.translations[0]?.title
    ?? post.slug;
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const nav = await getTranslations('Nav');
  const common = await getTranslations('Common');
  const blogT = await getTranslations('Blog');

  let featured: CatalogProduct[] = [];
  let categories: ApiCategory[] = [];
  let posts: BlogPost[] = [];
  try {
    const [featuredRes, categoryRes, blogRes] = await Promise.all([
      serverGetPaginated<CatalogProduct>(`/products?isFeatured=true&locale=${locale}&limit=8`),
      serverGet<ApiCategory[]>('/categories'),
      serverGetPaginated<BlogPost>(`/blog?limit=3&locale=${locale}`),
    ]);
    featured = featuredRes.data;
    categories = categoryRes;
    posts = blogRes.data;
  } catch {
    featured = [];
    categories = [];
    posts = [];
  }

  const heroProduct = featured[0];
  const heroImage = heroProduct ? productImage(heroProduct) : null;

  return (
    <div className="bg-white">
      <section className="relative min-h-[85vh] bg-[#E8F1F3]">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage.url}
            alt={heroImage.alt || productName(heroProduct)}
            className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[ken-burns_18s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
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

      <TrustBar />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionHeader
          title={t('featuredProducts')}
          description={t('newArrivals')}
          href="/products"
          linkLabel={common('viewAll')}
        />
        {featured.length === 0 ? (
          <p className="mt-8 text-sm text-[#475569]">{common('noResults')}</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        )}
      </section>

      {categories.length > 0 ? (
        <section className="bg-[#E8F1F3]/40 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeader title={t('topCategories')} description={t('categoriesLead')} />
            <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {categories.slice(0, 8).map((category) => (
                <li key={category.id}>
                  <CategoryCard category={category} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {posts.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeader
            title={t('latestPosts')}
            href="/blog"
            linkLabel={common('viewAll')}
          />
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <Link href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }} className="group block">
                  <div className="aspect-[16/10] overflow-hidden bg-[#E8F1F3]">
                    {post.featuredImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.featuredImageUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 font-heading text-base text-[#064E3B] group-hover:text-[#059669]">
                    {postTitle(post, locale)}
                  </p>
                  {post.publishedAt ? (
                    <p className="mt-1 text-xs text-[#475569]">
                      {blogT('publishedOn', {
                        date: new Date(post.publishedAt).toLocaleDateString(locale),
                      })}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
