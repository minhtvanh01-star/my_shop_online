'use client';

import { Heart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { ctaClassName } from '@/lib/brand';
import { unitPrice, productCompareAtUsd, discountPercent, type CatalogProductDetail } from '@/lib/catalog';
import { useShopSettings } from '@/components/storefront/ShopSettingsProvider';
import { formatDisplayPrice } from '@/lib/display-price';
import { useAddToCart } from '@/hooks/useCart';
import { useToggleWishlist, useWishlistIds } from '@/hooks/useWishlist';
import { useCartStore } from '@/stores/cartStore';
import { useIsAuthenticated } from '@/stores/authStore';

export function AddToCartPanel({ product }: { product: CatalogProductDetail }) {
  const t = useTranslations('Products');
  const cart = useTranslations('Cart');
  const locale = useLocale();
  const add = useAddToCart();
  const setOpen = useCartStore((s) => s.setOpen);
  const { usdToVnd } = useShopSettings();
  const isAuthenticated = useIsAuthenticated();
  const wishlistIds = useWishlistIds();
  const toggleWishlist = useToggleWishlist(product.id);
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState(variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const price = unitPrice(product.basePrice, selected?.priceModifier);
  const compareAt = productCompareAtUsd(product);
  const discount = compareAt ? discountPercent(price, compareAt) : 0;
  const stock = selected?.stockQuantity ?? product.stockQuantity;
  const out = stock <= 0;
  const inWishlist = wishlistIds.data?.has(product.id) ?? false;
  const groups = useMemo(() => {
    const map = new Map<string, CatalogProductDetail['variants']>();
    for (const variant of variants) {
      const list = map.get(variant.optionName) ?? [];
      list.push(variant);
      map.set(variant.optionName, list);
    }
    return [...map.entries()];
  }, [variants]);

  const pathname = usePathname();

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="font-heading text-2xl text-[#064E3B]">{formatDisplayPrice(price, locale, usdToVnd)}</p>
        {compareAt && compareAt > price ? (
          <>
            <p className="text-sm text-[#475569] line-through">{formatDisplayPrice(compareAt, locale, usdToVnd)}</p>
            {discount > 0 ? (
              <span className="bg-[#EA580C] px-2 py-0.5 text-xs font-semibold text-black">
                {t('discount', { percent: discount })}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
      {out ? <p className="text-sm text-[#DC2626]">{t('outOfStock')}</p> : <p className="text-sm text-[#475569]">{t('inStock', { count: stock })}</p>}

      {groups.map(([name, options]) => (
        <fieldset key={name}>
          <legend className="mb-2 text-sm font-medium text-[#064E3B]">{name}</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`h-11 cursor-pointer border px-3 text-sm ${
                  variantId === option.id ? 'border-[#059669] text-[#059669]' : 'border-[#E2E8F0]'
                }`}
                onClick={() => setVariantId(option.id)}
                aria-pressed={variantId === option.id}
              >
                {option.optionValue}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <div>
        <label htmlFor="qty" className="text-sm font-medium text-[#064E3B]">
          {t('quantity')}
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={Math.max(stock, 1)}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
          className="mt-1 h-11 w-24 border border-[#E2E8F0] px-3"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={`${ctaClassName} w-full md:w-auto`}
          disabled={out || add.isPending || (variants.length > 0 && !variantId)}
          onClick={async () => {
            await add.mutateAsync({
              productId: product.id,
              variantId,
              name: product.translations[0]?.name ?? product.slug,
              slug: product.slug,
              image: product.images[0]?.url ?? '',
              price,
              quantity: Math.min(quantity, stock),
              maxQuantity: stock,
              currency: product.currency,
              variantLabel: selected ? `${selected.optionName}: ${selected.optionValue}` : null,
            });
            setOpen(true);
          }}
        >
          {out ? t('outOfStock') : t('addToCart')}
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            className="flex h-11 cursor-pointer items-center gap-2 border border-[#E2E8F0] px-4 text-sm text-[#064E3B]"
            disabled={toggleWishlist.isPending}
            aria-pressed={inWishlist}
            onClick={async () => {
              setWishlistError(null);
              try {
                await toggleWishlist.mutateAsync(inWishlist);
              } catch {
                setWishlistError(t('wishlistError'));
              }
            }}
          >
            <Heart size={18} aria-hidden="true" fill={inWishlist ? 'currentColor' : 'none'} />
            {inWishlist ? t('removeFromWishlist') : t('addToWishlist')}
          </button>
        ) : (
          <Link
            href={{ pathname: '/auth/login', query: { redirect: pathname } }}
            className="flex h-11 items-center gap-2 border border-[#E2E8F0] px-4 text-sm text-[#064E3B]"
          >
            <Heart size={18} aria-hidden="true" />
            {t('addToWishlist')}
          </Link>
        )}
      </div>

      {add.isError ? <p className="text-sm text-[#DC2626]">{cart('maxQuantity')}</p> : null}
      {wishlistError ? <p className="text-sm text-[#DC2626]">{wishlistError}</p> : null}
    </div>
  );
}
