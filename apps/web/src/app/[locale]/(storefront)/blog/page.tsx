import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ctaClassName } from '@/lib/brand';
import { serverGetPaginated } from '@/lib/server-api';

type BlogPost = {
  id: string;
  slug: string;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  author: { fullName: string } | null;
  translations: { locale: string; title: string; excerpt?: string | null }[];
};

function postTitle(post: BlogPost, locale: string) {
  return (
    post.translations.find((row) => row.locale === locale)?.title ??
    post.translations[0]?.title ??
    post.slug
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Blog');
  return { title: t('pageTitle') };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const locale = await getLocale();
  const t = await getTranslations('Blog');
  const common = await getTranslations('Common');
  const page = Number(searchParams.page) || 1;

  const query = new URLSearchParams({ limit: '12', page: String(page) });
  if (searchParams.q) query.set('search', searchParams.q);

  let posts: BlogPost[] = [];
  let totalPages = 1;
  try {
    const result = await serverGetPaginated<BlogPost>(`/blog?${query.toString()}`);
    posts = result.data;
    totalPages = result.meta.totalPages;
  } catch {
    posts = [];
  }

  const pageQuery = (nextPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set('q', searchParams.q);
    params.set('page', String(nextPage));
    return `?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>

      <form
        className="mt-6 rounded-lg border border-[#E2E8F0] bg-[#E8F1F3]/30 p-4"
        method="get"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="q">{common('search')}</Label>
            <Input
              id="q"
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder={t('searchPlaceholder')}
            />
          </div>
          <button type="submit" className={ctaClassName}>
            {common('filter')}
          </button>
        </div>
      </form>

      {posts.length === 0 ? (
        <p className="mt-10 text-sm text-[#475569]">{common('noResults')}</p>
      ) : (
        <ul className="mt-8 space-y-8">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }} className="block">
                <h2 className="font-heading text-xl text-[#064E3B]">{postTitle(post, locale)}</h2>
                {post.translations.find((row) => row.locale === locale)?.excerpt ? (
                  <p className="mt-2 text-sm text-[#475569]">
                    {post.translations.find((row) => row.locale === locale)?.excerpt}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-[#059669]">{t('readMore')}</p>
              </Link>
            </li>
          ))}
        </ul>
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
