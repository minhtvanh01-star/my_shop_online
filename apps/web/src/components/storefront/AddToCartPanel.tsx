'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ctaClassName } from '@/lib/brand';
import { unitPrice, type CatalogProductDetail } from '@/lib/catalog';
import { formatMoney } from '@/lib/format-money';
import { useAddToCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cartStore';

export function AddToCartPanel({ product }: { product: CatalogProductDetail }) {
  const t = useTranslations('Products');
  const cart = useTranslations('Cart');
  const locale = useLocale();
  const add = useAddToCart();
  const setOpen = useCartStore((s) => s.setOpen);
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState(variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const price = unitPrice(product.basePrice, selected?.priceModifier);
  const stock = selected?.stockQuantity ?? product.stockQuantity;
  const out = stock <= 0;
  const groups = useMemo(() => {
    const map = new Map<string, CatalogProductDetail['variants']>();
    for (const variant of variants) {
      const list = map.get(variant.optionName) ?? [];
      list.push(variant);
      map.set(variant.optionName, list);
    }
    return [...map.entries()];
  }, [variants]);

  return (
    <div className="mt-6 space-y-4">
      <p className="font-heading text-2xl text-[#064E3B]">{formatMoney(price, product.currency, locale)}</p>
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
      {add.isError ? <p className="text-sm text-[#DC2626]">{cart('maxQuantity')}</p> : null}
    </div>
  );
}
