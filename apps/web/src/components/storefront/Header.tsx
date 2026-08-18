'use client';

import { Heart, Menu, Package, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitch } from '@/components/storefront/LocaleSwitch';
import { HeaderSearch } from '@/components/storefront/HeaderSearch';
import { useLogout } from '@/hooks/useAuth';
import { brand } from '@/lib/brand';
import { staffHomePath } from '@/lib/roles';
import { useCartCount, useCartStore } from '@/stores/cartStore';
import { useCurrentUser, useHasHydrated, useIsStaff } from '@/stores/authStore';

export function Header() {
  const t = useTranslations('Nav');
  const locale = useLocale();
  const count = useCartCount();
  const setOpen = useCartStore((s) => s.setOpen);
  const user = useCurrentUser();
  const hydrated = useHasHydrated();
  const isStaff = useIsStaff();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const nav = [
    { href: '/' as const, label: t('home') },
    { href: '/products' as const, label: t('products') },
    { href: '/blog' as const, label: t('blog') },
  ];

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-heading text-lg font-semibold text-[#064E3B]">
          {brand.name}
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[#475569] underline-offset-4 hover:text-[#059669] hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <HeaderSearch className="min-w-0 flex-1 md:max-w-xs" />
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <LocaleSwitch />
          {hydrated && user ? (
            <>
              <Link
                href="/wishlist"
                className="hidden h-11 items-center gap-1 px-2 text-sm text-[#064E3B] md:flex"
                aria-label={t('wishlist')}
              >
                <Heart size={18} aria-hidden="true" />
                <span className="sr-only md:not-sr-only">{t('wishlist')}</span>
              </Link>
              <Link
                href="/orders"
                className="hidden h-11 items-center gap-1 px-2 text-sm text-[#064E3B] md:flex"
                aria-label={t('orders')}
              >
                <Package size={18} aria-hidden="true" />
                <span className="sr-only md:not-sr-only">{t('orders')}</span>
              </Link>
              <Link
                href="/account"
                className="hidden h-11 items-center gap-1 px-2 text-sm text-[#064E3B] md:flex"
              >
                <UserRound size={18} aria-hidden="true" />
                {t('account')}
              </Link>
              {isStaff ? (
                <a href={staffHomePath(user.role, locale)} className="hidden text-sm text-[#059669] md:inline">
                  {t('admin')}
                </a>
              ) : null}
              <button
                type="button"
                className="hidden h-11 cursor-pointer px-2 text-sm text-[#475569] md:inline"
                onClick={() => logout.mutate()}
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="hidden h-11 items-center px-2 text-sm text-[#064E3B] md:flex">
              {t('login')}
            </Link>
          )}
          <Link
            href="/cart"
            className="hidden h-11 items-center px-2 text-sm text-[#064E3B] md:flex"
          >
            {t('cart')}
          </Link>
          <button
            type="button"
            className="relative flex h-11 w-11 cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
            onClick={() => setOpen(true)}
            aria-label={t('cart')}
          >
            <ShoppingBag size={20} aria-hidden="true" />
            {count > 0 ? (
              <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[#EA580C] px-1 text-center text-[10px] font-semibold text-black">
                {count}
              </span>
            ) : null}
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav className="space-y-2 border-t border-[#E2E8F0] px-4 py-3 md:hidden" aria-label="Mobile">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="block py-2 text-[#064E3B]" onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/cart" className="block py-2" onClick={() => setMenuOpen(false)}>
            {t('cart')}
          </Link>
          {hydrated && user ? (
            <>
              <Link href="/wishlist" className="block py-2" onClick={() => setMenuOpen(false)}>
                {t('wishlist')}
              </Link>
              <Link href="/orders" className="block py-2" onClick={() => setMenuOpen(false)}>
                {t('orders')}
              </Link>
              <Link href="/account" className="block py-2" onClick={() => setMenuOpen(false)}>
                {t('account')}
              </Link>
              {isStaff ? (
                <a href={staffHomePath(user.role, locale)} className="block py-2 text-[#059669]" onClick={() => setMenuOpen(false)}>
                  {t('admin')}
                </a>
              ) : null}
              <button type="button" className="block py-2" onClick={() => logout.mutate()}>
                {t('logout')}
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="block py-2" onClick={() => setMenuOpen(false)}>
              {t('login')}
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
