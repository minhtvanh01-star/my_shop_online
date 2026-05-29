import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: params.slug };
}

export default async function CategoryPage({ params }: Props) {
  return (
    <div className="container py-8">
      {/* <CategoryBanner /> */}
      {/* <ProductGrid categorySlug={params.slug} /> */}
    </div>
  );
}
