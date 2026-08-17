'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ctaClassName } from '@/lib/brand';
import { formatMoney } from '@/lib/format-money';
import { useRemoveCartItem, useUpdateCartQuantity } from '@/hooks/useCart';
import { useCartItems, useCartTotal } from '@/stores/cartStore';

export default function CartPage() {
  const t = useTranslations('Cart');
  const locale = useLocale();
  const items = useCartItems();
  const total = useCartTotal();
  const updateCart = useUpdateCartQuantity();
  const removeCart = useRemoveCartItem();
  const currency = items[0]?.currency ?? (locale === 'vi' ? 'VND' : 'USD');

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
                  <p className="font-medium text-[#064E3B]">{item.name}</p>
                  {item.variantLabel ? <p className="text-sm text-[#475569]">{item.variantLabel}</p> : null}
                  <p className="mt-1">{formatMoney(item.price, item.currency, locale)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-8 w-8 border"
                      onClick={() =>
                        updateCart.mutate({ cartItemId: item.cartItemId, quantity: item.quantity - 1 })
                      }
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="h-8 w-8 border"
                      onClick={() =>
                        updateCart.mutate({ cartItemId: item.cartItemId, quantity: item.quantity + 1 })
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-4 text-sm text-[#DC2626]"
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
              <span>{formatMoney(total, currency, locale)}</span>
            </div>
            <p className="mt-2 text-xs text-[#475569]">{t('shippingCalculated')}</p>
            <Link href="/checkout" className={`${ctaClassName} mt-4 w-full`}>
              {t('checkout')}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
