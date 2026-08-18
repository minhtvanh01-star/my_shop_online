'use client';

import type { ComponentProps } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, getPathname } from '@/i18n/navigation';
import { useIsAuthenticated } from '@/stores/authStore';

type CheckoutLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  onNavigate?: () => void;
};

export function CheckoutLink({ className, children, onClick, onNavigate, ...rest }: CheckoutLinkProps) {
  const t = useTranslations('Cart');
  const locale = useLocale();
  const authed = useIsAuthenticated();
  const checkoutPath = getPathname({ href: '/checkout', locale: locale as 'vi' | 'en' });

  if (authed) {
    return (
      <Link
        href="/checkout"
        className={className}
        onClick={(event) => {
          onNavigate?.();
          onClick?.(event);
        }}
        {...rest}
      >
        {children ?? t('checkout')}
      </Link>
    );
  }

  return (
    <Link
      href={{ pathname: '/auth/login', query: { redirect: checkoutPath } }}
      className={className}
      onClick={(event) => {
        onNavigate?.();
        onClick?.(event);
      }}
      {...rest}
    >
      {children ?? t('checkout')}
    </Link>
  );
}
