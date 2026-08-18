import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { AddToCartPanel } from '@/components/storefront/AddToCartPanel';
import { ProductBreadcrumb } from '@/components/storefront/ProductBreadcrumb';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ProductGallery } from '@/components/storefront/ProductGallery';
import { ProductReviews } from '@/components/storefront/ProductReviews';
import { SectionHeader } from '@/components/storefront/SectionHeader';
import {
  productName,
  type CatalogProduct,
  type CatalogProductDetail,
} from '@/lib/catalog';
import { serverGet, serverGetPaginated } from '@/lib/server-api';

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
  const nav = await getTranslations('Nav');
  const common = await getTranslations('Common');

  let product: CatalogProductDetail;
  try {
    product = await serverGet<CatalogProductDetail>(`/products/${params.slug}?locale=${locale}`);
  } catch {
    notFound();
  }

  const name = productName(product);
  const description = product.translations[0]?.description;

  let related: CatalogProduct[] = [];
  if (product.category?.id) {
    try {
      const result = await serverGetPaginated<CatalogProduct>(
        `/products?locale=${locale}&categoryId=${product.category.id}&limit=5`,
      );
      related = result.data.filter((item) => item.id !== product.id).slice(0, 4);
    } catch {
      related = [];
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ProductBreadcrumb
        category={product.category}
        productName={name}
        homeLabel={nav('home')}
        productsLabel={nav('products')}
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} alt={name} />
        <div>
          {product.category ? (
            <p className="text-xs uppercase tracking-wide text-[#475569]">{product.category.name}</p>
          ) : null}
          <h1 className="mt-1 font-heading text-3xl text-[#064E3B] md:text-4xl">{name}</h1>
          <p className="mt-1 text-xs text-[#475569]">SKU: {product.sku}</p>
          <AddToCartPanel product={product} />
        </div>
      </div>

      {description ? (
        <section className="mt-14 border-t border-[#E2E8F0] pt-10">
          <h2 className="font-heading text-xl text-[#064E3B]">{t('description')}</h2>
          <div className="prose prose-sm mt-4 max-w-3xl whitespace-pre-wrap text-[#475569]">{description}</div>
        </section>
      ) : null}

      <ProductReviews productId={product.id} />

      {related.length > 0 ? (
        <section className="mt-16 border-t border-[#E2E8F0] pt-10">
          <SectionHeader title={t('relatedProducts')} linkLabel={common('viewAll')} href="/products" />
          <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <ProductCard product={item} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
