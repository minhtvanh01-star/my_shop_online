import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string; locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Fetch product by slug to get name for SEO
  return { title: params.slug };
}

export default async function ProductDetailPage({ params }: Props) {
  return (
    <div className="container py-8">
      {/* <ProductGallery /> */}
      {/* <ProductInfo /> */}
      {/* <ProductVariantSelector /> */}
      {/* <AddToCartButton /> */}
      {/* <ProductReviews /> */}
      {/* <RelatedProducts /> */}
    </div>
  );
}
