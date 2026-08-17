import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { AddToCartPanel } from '@/components/storefront/AddToCartPanel';
import { productImage, productName, type CatalogProductDetail } from '@/lib/catalog';
import { serverGet } from '@/lib/server-api';

interface Props {
  params: { slug: string; locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const product = await serverGet<CatalogProductDetail>(`/products/${params.slug}?locale=${params.locale}`);
    return { title: productName(product) };
  } catch {
    return { title: params.slug };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('Products');
  let product: CatalogProductDetail;
  try {
    product = await serverGet<CatalogProductDetail>(`/products/${params.slug}?locale=${locale}`);
  } catch {
    notFound();
  }

  const image = productImage(product);
  const name = productName(product);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div className="aspect-square bg-[#E8F1F3]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.alt || name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div>
        <h1 className="font-heading text-3xl text-[#064E3B]">{name}</h1>
        {product.category ? <p className="mt-2 text-sm text-[#475569]">{product.category.name}</p> : null}
        <AddToCartPanel product={product} />
        {product.translations[0]?.description ? (
          <div className="mt-8">
            <h2 className="font-heading text-lg">{t('description')}</h2>
            <p className="mt-2 whitespace-pre-wrap text-[#475569]">{product.translations[0].description}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
