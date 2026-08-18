'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CheckoutLink } from '@/components/storefront/CheckoutLink';
import { useShopSettings } from '@/components/storefront/ShopSettingsProvider';
import { ctaClassName } from '@/lib/brand';
import { formatDisplayPrice } from '@/lib/display-price';
import { useRemoveCartItem, useUpdateCartQuantity } from '@/hooks/useCart';
import { useCartItems, useCartStore, useCartTotal } from '@/stores/cartStore';

export function CartDrawer() {
  const t = useTranslations('Cart');
  const nav = useTranslations('Nav');
  const common = useTranslations('Common');
  const locale = useLocale();
  const items = useCartItems();
  const total = useCartTotal();
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const updateCart = useUpdateCartQuantity();
  const removeCart = useRemoveCartItem();
  const { usdToVnd } = useShopSettings();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/40"
        aria-label={common('close')}
        onClick={() => setOpen(false)}
      />
      <aside
        ref={panelRef}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
          <h2 id="cart-drawer-title" className="font-heading text-lg font-semibold text-[#064E3B]">
            {nav('cart')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
            onClick={() => setOpen(false)}
            aria-label={common('close')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <p className="text-sm text-[#475569]">{t('empty')}</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.cartItemId} className="flex gap-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="h-16 w-16 object-cover" />
                  ) : (
                    <div className="h-16 w-16 bg-[#E8F1F3]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={{ pathname: '/products/[slug]', params: { slug: item.slug } }}
                      className="block truncate text-sm font-medium text-[#064E3B]"
                      onClick={() => setOpen(false)}
                    >
                      {item.name}
                    </Link>
                    {item.variantLabel ? (
                      <p className="text-xs text-[#475569]">{item.variantLabel}</p>
                    ) : null}
                    <p className="text-sm">{formatDisplayPrice(item.price, locale, usdToVnd)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        className="h-8 w-8 cursor-pointer border border-[#E2E8F0]"
                        disabled={updateCart.isPending}
                        onClick={() => updateCart.mutate({ cartItemId: item.cartItemId, quantity: item.quantity - 1 })}
                        aria-label={t('decreaseQuantity')}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        className="h-8 w-8 cursor-pointer border border-[#E2E8F0]"
                        disabled={updateCart.isPending}
                        onClick={() => updateCart.mutate({ cartItemId: item.cartItemId, quantity: item.quantity + 1 })}
                        aria-label={t('increaseQuantity')}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto cursor-pointer text-xs text-[#DC2626]"
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
          )}
        </div>
        <div className="border-t border-[#E2E8F0] p-4">
          <div className="mb-3 flex justify-between text-sm">
            <span>{t('subtotal')}</span>
            <span>{formatDisplayPrice(total, locale, usdToVnd)}</span>
          </div>
          <Link
            href="/cart"
            className="mb-2 block text-center text-sm text-[#059669] underline"
            onClick={() => setOpen(false)}
          >
            {t('viewCart')}
          </Link>
          <CheckoutLink className={`${ctaClassName} w-full`} onNavigate={() => setOpen(false)} />
        </div>
      </aside>
    </div>
  );
}
