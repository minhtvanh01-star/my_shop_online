import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
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
  return post.translations.find((row) => row.locale === locale)?.title
    ?? post.translations[0]?.title
    ?? post.slug;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Blog');
  return { title: t('pageTitle') };
}

export default async function BlogPage() {
  const locale = await getLocale();
  const t = await getTranslations('Blog');
  let posts: BlogPost[] = [];
  try {
    const result = await serverGetPaginated<BlogPost>('/blog?limit=12');
    posts = result.data;
  } catch {
    posts = [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
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
    </div>
  );
}
