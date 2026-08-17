'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { formatMoney } from '@/lib/format-money';

type DashboardStats = {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: string | number;
  pendingOrders: number;
  totalProducts: number;
};

export default function AdminDashboardPage() {
  const t = useTranslations('Admin');
  const stats = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<{ data: DashboardStats }>('/admin/dashboard').then((r) => r.data.data),
  });
  const data = stats.data;

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
