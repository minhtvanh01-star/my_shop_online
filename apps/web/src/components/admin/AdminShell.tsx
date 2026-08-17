'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHasHydrated, useIsAdmin } from '@/stores/authStore';

const LINKS = [
  { href: 'dashboard', key: 'dashboard' },
  { href: 'products', key: 'products' },
  { href: 'orders', key: 'orders' },
  { href: 'customers', key: 'customers' },
  { href: 'blog', key: 'blog' },
  { href: 'media', key: 'media' },
  { href: 'settings', key: 'settings' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Admin');
  const errors = useTranslations('Errors');
  const hydrated = useHasHydrated();
  const isAdmin = useIsAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'vi';
  const prefix = `/${locale}/admin`;

  useEffect(() => {
    if (hydrated && !isAdmin) {
      router.replace(`/${locale}`);
    }
  }, [hydrated, isAdmin, locale, router]);

  if (!hydrated) {
    return <div className="p-6 text-sm text-[#475569]">…</div>;
  }
  if (!isAdmin) {
    return <p className="p-6 text-sm text-[#DC2626]">{errors('unauthorized')}</p>;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-56 border-r border-[#E2E8F0] p-4">
        <p className="font-heading text-lg text-[#064E3B]">{t('dashboard')}</p>
        <nav className="mt-6 flex flex-col gap-2 text-sm">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={`${prefix}/${link.href}`}
              className={
                pathname.includes(`/admin/${link.href}`)
                  ? 'text-[#059669]'
                  : 'text-[#475569] hover:text-[#059669]'
              }
            >
              {t(link.key)}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
