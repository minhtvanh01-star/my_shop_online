'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ProductForm, type ProductFormInitial } from '@/components/admin/ProductForm';
import api from '@/lib/api';

type AdminProductDetail = {
  id: string;
  slug: string;
  sku: string;
  type?: string;
  basePrice: string | number;
  currency: string;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  category: { id: string } | null;
  productCategories?: { category: { id: string } }[];
  specifications?: { name: string; value: string; unit?: string | null }[];
  images: { url: string; altText?: string | null; isPrimary?: boolean }[];
  variants: {
    sku: string;
    optionName: string;
    optionValue: string;
    priceModifier: string | number;
    stockQuantity: number;
  }[];
  translations: {
    locale: string;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
  }[];
  prices?: { currency: string; amount: string | number; compareAt?: string | number | null }[];
};

function toForm(product: AdminProductDetail): ProductFormInitial {
  const vi = product.translations.find((row) => row.locale === 'vi');
  const en = product.translations.find((row) => row.locale === 'en');
  const priceRow = product.prices?.[0];
  return {
    slug: product.slug,
    sku: product.sku,
    type: product.type ?? 'simple',
    categoryId: product.category?.id ?? '',
    categoryIds: (product.productCategories ?? []).map((row) => row.category.id),
    currency: product.currency,
    basePrice: String(product.basePrice),
    compareAt: priceRow?.compareAt != null ? String(priceRow.compareAt) : '',
    stockQuantity: String(product.stockQuantity),
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    nameVi: vi?.name ?? product.translations[0]?.name ?? '',
    nameEn: en?.name ?? '',
    shortVi: vi?.shortDescription ?? '',
    shortEn: en?.shortDescription ?? '',
    descVi: vi?.description ?? '',
    descEn: en?.description ?? '',
    images: product.images.map((image) => ({
      url: image.url,
      altText: image.altText ?? '',
      isPrimary: Boolean(image.isPrimary),
    })),
    specs:
      product.specifications?.length
        ? product.specifications.map((spec) => ({
            name: spec.name,
            value: spec.value,
            unit: spec.unit ?? '',
          }))
        : [{ name: '', value: '', unit: '' }],
    variants: [],
  };
}

export default function AdminProductEditPage() {
  const common = useTranslations('Common');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['admin-product', params.id, locale],
    queryFn: () =>
      api
        .get<{ data: AdminProductDetail }>(`/products/admin/${params.id}`, { params: { locale } })
        .then((r) => r.data.data),
  });

  if (query.isLoading) {
    return <p className="text-sm text-[#475569]">{common('loading')}</p>;
  }

  if (!query.data) {
    return (
      <div>
        <p className="text-sm text-[#475569]">{common('noResults')}</p>
        <Link href={`/${locale}/admin/products`} className="mt-4 inline-block text-[#059669] hover:underline">
          {common('back')}
        </Link>
      </div>
    );
  }

  return (
    <ProductForm
      mode="edit"
      productId={query.data.id}
      initial={toForm(query.data)}
      existingVariants={query.data.variants.map((variant) => ({
        sku: variant.sku,
        optionName: variant.optionName,
        optionValue: variant.optionValue,
        priceModifier: String(variant.priceModifier),
        stockQuantity: String(variant.stockQuantity),
      }))}
    />
  );
}
