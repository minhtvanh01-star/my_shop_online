'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CheckoutLink } from '@/components/storefront/CheckoutLink';
import { useShopSettings } from '@/components/storefront/ShopSettingsProvider';
import { ctaClassName } from '@/lib/brand';
import { formatDisplayPrice } from '@/lib/display-price';
import { useRemoveCartItem, useUpdateCartQuantity } from '@/hooks/useCart';
import { useCartItems, useCartStore, useCartTotal } from '@/stores/cartStore';

export default function CartPage() {
  const t = useTranslations('Cart');
  const locale = useLocale();
  const items = useCartItems();
  const total = useCartTotal();
  const updateCart = useUpdateCartQuantity();
  const removeCart = useRemoveCartItem();
  const { usdToVnd } = useShopSettings();
  const setOpen = useCartStore((s) => s.setOpen);

  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
      {items.length === 0 ? (
        <div className="mt-8">
          <p className="text-[#475569]">{t('empty')}</p>
          <p className="mt-1 text-sm text-[#475569]">{t('emptyDescription')}</p>
          <Link href="/products" className={`${ctaClassName} mt-6`}>
            {t('continueShopping')}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 md:grid-cols-[1fr_280px]">
          <ul className="space-y-6">
            {items.map((item) => (
              <li key={item.cartItemId} className="flex gap-4 border-b border-[#E2E8F0] pb-4">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-24 w-24 object-cover" />
                ) : (
                  <div className="h-24 w-24 bg-[#E8F1F3]" />
                )}
                <div className="flex-1">
                  <Link
                    href={{ pathname: '/products/[slug]', params: { slug: item.slug } }}
                    className="font-medium text-[#064E3B] hover:text-[#059669]"
                  >
                    {item.name}
                  </Link>
                  {item.variantLabel ? <p className="text-sm text-[#475569]">{item.variantLabel}</p> : null}
                  <p className="mt-1">{formatDisplayPrice(item.price, locale, usdToVnd)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-8 w-8 cursor-pointer border border-[#E2E8F0]"
                      disabled={updateCart.isPending}
                      onClick={() =>
                        updateCart.mutate({ cartItemId: item.cartItemId, quantity: item.quantity - 1 })
                      }
                      aria-label="-"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="h-8 w-8 cursor-pointer border border-[#E2E8F0]"
                      disabled={updateCart.isPending}
                      onClick={() =>
                        updateCart.mutate({ cartItemId: item.cartItemId, quantity: item.quantity + 1 })
                      }
                      aria-label="+"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-4 cursor-pointer text-sm text-[#DC2626]"
                      disabled={removeCart.isPending}
                      onClick={() => removeCart.mutate(item.cartItemId)}
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit bg-[#E8F1F3] p-4">
            <div className="flex justify-between text-sm">
              <span>{t('subtotal')}</span>
              <span>{formatDisplayPrice(total, locale, usdToVnd)}</span>
            </div>
            <p className="mt-2 text-xs text-[#475569]">{t('shippingCalculated')}</p>
            <CheckoutLink className={`${ctaClassName} mt-4 w-full`} />
          </aside>
        </div>
      )}
    </div>
  );
}
