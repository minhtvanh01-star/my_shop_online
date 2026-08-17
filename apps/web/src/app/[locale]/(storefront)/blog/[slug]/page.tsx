import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { serverGet } from '@/lib/server-api';

type BlogPostDetail = {
  slug: string;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  author: { fullName: string } | null;
  translations: { locale: string; title: string; content?: string | null; excerpt?: string | null }[];
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const post = await serverGet<BlogPostDetail>(`/blog/${params.slug}`);
    return { title: post.translations[0]?.title ?? params.slug };
  } catch {
    return { title: params.slug };
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const locale = await getLocale();
  const t = await getTranslations('Blog');
  let post: BlogPostDetail;
  try {
    post = await serverGet<BlogPostDetail>(`/blog/${params.slug}`);
  } catch {
    notFound();
  }
  const translation =
    post.translations.find((row) => row.locale === locale) ?? post.translations[0];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{translation?.title ?? post.slug}</h1>
      {post.publishedAt ? (
        <p className="mt-2 text-sm text-[#475569]">
          {t('publishedOn', { date: new Date(post.publishedAt).toLocaleDateString(locale) })}
          {post.author ? ` · ${t('by', { author: post.author.fullName })}` : ''}
        </p>
      ) : null}
      {post.featuredImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.featuredImageUrl} alt="" className="mt-6 w-full object-cover" />
      ) : null}
      {translation?.content ? (
        <div className="mt-8 whitespace-pre-wrap text-[#475569]">{translation.content}</div>
      ) : null}
    </article>
  );
}
