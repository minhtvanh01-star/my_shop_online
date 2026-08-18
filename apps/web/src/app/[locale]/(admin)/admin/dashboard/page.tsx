'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { isAdminRole, staffHomePath } from '@/lib/roles';
import { useCurrentUser } from '@/stores/authStore';

type DashboardStats = {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: string | number;
  pendingOrders: number;
  totalProducts: number;
};

export default function AdminDashboardPage() {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const router = useRouter();
  const user = useCurrentUser();
  const allowed = isAdminRole(user?.role);

  useEffect(() => {
    if (user && !isAdminRole(user.role)) {
      router.replace(staffHomePath(user.role, locale));
    }
  }, [user, locale, router]);

  const stats = useQuery({
    queryKey: ['admin-dashboard'],
    enabled: allowed,
    queryFn: () => api.get<{ data: DashboardStats }>('/admin/dashboard').then((r) => r.data.data),
  });
  const data = stats.data;

  if (!allowed) return null;

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('dashboard')}</h1>
      <dl className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
        <div>
          <dt className="text-sm text-[#475569]">{t('stats.totalRevenue')}</dt>
          <dd className="mt-1 text-2xl">{formatMoney(data?.totalRevenue, 'VND', 'vi')}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#475569]">{t('stats.totalOrders')}</dt>
          <dd className="mt-1 text-2xl">{data?.totalOrders ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#475569]">{t('stats.totalCustomers')}</dt>
          <dd className="mt-1 text-2xl">{data?.totalUsers ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#475569]">{t('stats.totalProducts')}</dt>
          <dd className="mt-1 text-2xl">{data?.totalProducts ?? '—'}</dd>
        </div>
      </dl>
    </div>
  );
}
