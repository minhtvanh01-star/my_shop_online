'use client';

import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { type FormEvent } from 'react';
import { getPathname } from '@/i18n/navigation';
import { productsSearchUrl } from '@/lib/products-search';

export function HeaderSearch({ className }: { className?: string }) {
  const t = useTranslations('Products');
  const common = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') ?? '');
    const path = getPathname({ href: '/products', locale: locale as 'vi' | 'en' });
    router.push(productsSearchUrl(path, q));
  }

  return (
    <form onSubmit={onSubmit} className={className} role="search">
      <label htmlFor="header-search" className="sr-only">
        {common('search')}
      </label>
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
        />
        <input
          id="header-search"
          name="q"
          type="search"
          autoComplete="off"
          placeholder={t('searchPlaceholder')}
          className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-sm text-[#064E3B] outline-none placeholder:text-[#475569]/70 focus-visible:border-[#059669] focus-visible:ring-[3px] focus-visible:ring-[#059669]/20"
        />
      </div>
    </form>
  );
}
