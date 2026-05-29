import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Blog');
  return { title: t('pageTitle') };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  return (
    <div className="container py-8">
      {/* <BlogPostGrid /> */}
      {/* <Pagination /> */}
    </div>
  );
}
