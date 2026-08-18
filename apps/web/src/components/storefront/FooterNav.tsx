'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useHasHydrated, useIsAuthenticated } from '@/stores/authStore';

export function FooterNav() {
  const t = useTranslations('Nav');
  const hydrated = useHasHydrated();
  const authed = useIsAuthenticated();

  const linkClass = 'text-[#475569] hover:text-[#059669]';

  return (
    <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
      <Link href="/products" className={linkClass}>
        {t('products')}
      </Link>
      <Link href="/blog" className={linkClass}>
        {t('blog')}
      </Link>
      {hydrated && authed ? (
        <>
          <Link href="/account" className={linkClass}>
            {t('account')}
          </Link>
          <Link href="/orders" className={linkClass}>
            {t('orders')}
          </Link>
          <Link href="/wishlist" className={linkClass}>
            {t('wishlist')}
          </Link>
        </>
      ) : (
        <Link href="/auth/login" className={linkClass}>
          {t('login')}
        </Link>
      )}
    </nav>
  );
}
