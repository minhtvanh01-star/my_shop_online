import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: params.slug };
}

export default async function BlogPostPage({ params }: Props) {
  return (
    <article className="container py-8 prose prose-lg dark:prose-invert max-w-3xl mx-auto">
      {/* <BlogPostHeader /> */}
      {/* <BlogPostContent /> */}
      {/* <BlogPostAuthor /> */}
    </article>
  );
}
