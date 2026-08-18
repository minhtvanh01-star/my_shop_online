import { parseAmount } from './format-money';
import type { CartItem } from '../types';

export type ApiTranslation = {
  name?: string;
  shortDescription?: string | null;
  description?: string | null;
  locale?: string;
};
export type ApiImage = { url: string; altText?: string | null };

export type CatalogProduct = {
  id: string;
  slug: string;
  sku: string;
  basePrice: string | number;
  currency: string;
  stockQuantity: number;
  isFeatured?: boolean;
  images: ApiImage[];
  translations: ApiTranslation[];
  category: { id: string; slug: string; name: string } | null;
};

export type CatalogVariant = {
  id: string;
  sku: string;
  optionName: string;
  optionValue: string;
  priceModifier: string | number;
  stockQuantity: number;
  imageUrl?: string | null;
  isActive?: boolean;
};

export type CatalogProductDetail = CatalogProduct & {
  variants: CatalogVariant[];
  prices?: { currency: string; amount: string | number; compareAt?: string | number | null }[];
  specifications?: { name: string; value: string; unit?: string | null }[];
  productCategories?: { isPrimary: boolean; category: { id: string; slug: string; name: string } }[];
};

export type ApiCartLine = {
  id: string;
  quantity: number;
  product: {
    id: string;
    slug: string;
    basePrice: string | number;
    currency: string;
    stockQuantity: number;
    translations: ApiTranslation[];
    images: ApiImage[];
  };
  variant: {
    id: string;
    optionName: string;
    optionValue: string;
    priceModifier: string | number;
    stockQuantity: number;
  } | null;
};

export type ApiCategory = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  parentId: string | null;
  children?: ApiCategory[];
};

export function productName(product: { translations: ApiTranslation[]; slug: string }): string {
  return product.translations[0]?.name?.trim() || product.slug;
}

export function productImage(product: { images: ApiImage[] }): { url: string; alt: string } | null {
  const image = product.images[0];
  if (!image?.url) return null;
  return { url: image.url, alt: image.altText ?? '' };
}

/** Compare-at price in USD from product_prices, if higher than sale price. */
export function productCompareAtUsd(product: {
  basePrice: string | number;
  prices?: { currency: string; amount?: string | number; compareAt?: string | number | null }[];
}): number | null {
  const usdRow = product.prices?.find((row) => row.currency === 'USD');
  const sale = parseAmount(usdRow?.amount ?? product.basePrice);
  const compare = parseAmount(usdRow?.compareAt);
  return compare > sale ? compare : null;
}

export function discountPercent(sale: number, compare: number): number {
  if (compare <= 0 || sale >= compare) return 0;
  return Math.round(((compare - sale) / compare) * 100);
}

export function unitPrice(
  basePrice: string | number,
  priceModifier: string | number | null | undefined = 0,
): number {
  return parseAmount(basePrice) + parseAmount(priceModifier);
}

export function mapApiCartLine(line: ApiCartLine): CartItem {
  const modifier = line.variant?.priceModifier ?? 0;
  return {
    cartItemId: line.id,
    productId: line.product.id,
    variantId: line.variant?.id ?? null,
    name: productName(line.product),
    slug: line.product.slug,
    image: line.product.images[0]?.url ?? '',
    price: unitPrice(line.product.basePrice, modifier),
    quantity: line.quantity,
    maxQuantity: line.variant?.stockQuantity ?? line.product.stockQuantity,
    currency: line.product.currency,
    variantLabel: line.variant
      ? `${line.variant.optionName}: ${line.variant.optionValue}`
      : null,
  };
}
