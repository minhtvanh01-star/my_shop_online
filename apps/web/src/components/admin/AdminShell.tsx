'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { getPathname } from '@/i18n/navigation';
import { canManageInventory, canManageOrders, isAdminRole } from '@/lib/roles';
import { useCurrentUser, useHasHydrated, useIsStaff } from '@/stores/authStore';
import type { UserRole } from '@/types';

type NavLink = {
  href: string;
  key: 'dashboard' | 'inventory' | 'products' | 'orders' | 'customers' | 'blog' | 'media' | 'settings' | 'auditLogs';
  show: (role: UserRole | undefined) => boolean;
};

const LINKS: NavLink[] = [
  { href: 'dashboard', key: 'dashboard', show: (role) => isAdminRole(role) },
  { href: 'inventory', key: 'inventory', show: (role) => canManageInventory(role) },
  { href: 'products', key: 'products', show: (role) => isAdminRole(role) },
  { href: 'orders', key: 'orders', show: (role) => canManageOrders(role) },
  { href: 'customers', key: 'customers', show: (role) => isAdminRole(role) || role === 'SUPPORT' },
  { href: 'blog', key: 'blog', show: (role) => isAdminRole(role) || role === 'CONTENT' },
  { href: 'media', key: 'media', show: (role) => isAdminRole(role) || role === 'CONTENT' },
  { href: 'settings', key: 'settings', show: (role) => isAdminRole(role) },
  { href: 'audit-logs', key: 'auditLogs', show: (role) => isAdminRole(role) },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Admin');
  const errors = useTranslations('Errors');
  const hydrated = useHasHydrated();
  const isStaff = useIsStaff();
  const user = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'vi';
  const prefix = `/${locale}/admin`;

  const links = useMemo(
    () => LINKS.filter((link) => link.show(user?.role)),
    [user?.role],
  );

  useEffect(() => {
    if (hydrated && !isStaff) {
      const staffLogin = getPathname({
        href: '/auth/staff-login',
        locale: locale as 'vi' | 'en',
      });
      router.replace(`${staffLogin}?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isStaff, locale, pathname, router]);

  if (!hydrated) {
    return <div className="p-6 text-sm text-[#475569]">…</div>;
  }
  if (!isStaff) {
    return <p className="p-6 text-sm text-[#DC2626]">{errors('unauthorized')}</p>;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-56 border-r border-[#E2E8F0] p-4">
        <p className="font-heading text-lg text-[#064E3B]">{t('workspace')}</p>
        <nav className="mt-6 flex flex-col gap-2 text-sm">
          {links.map((link) => (
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
