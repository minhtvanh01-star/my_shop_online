'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import api from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import type { PaginatedApiResponse } from '@/lib/api';

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  totalAmount: string | number;
  createdAt: string;
};

export default function OrdersPage() {
  const t = useTranslations('Orders');
  const locale = useLocale();
  const query = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<PaginatedApiResponse<OrderRow>>('/orders').then((r) => r.data),
  });

  const items = query.data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
      {items.length === 0 ? (
        <p className="mt-8 text-[#475569]">{t('empty')}</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((order) => (
            <li key={order.id} className="border-b border-[#E2E8F0] pb-4">
              <Link href={{ pathname: '/orders/[id]', params: { id: order.id } }} className="font-medium text-[#059669]">
                {t('orderNumber', { number: order.orderNumber })}
              </Link>
              <p className="text-sm text-[#475569]">
                {t(`status.${order.status}` as 'status.pending')} ·{' '}
                {t('placedOn', { date: new Date(order.createdAt).toLocaleDateString(locale) })}
              </p>
              <p className="text-sm">
                {t('total', { amount: formatMoney(order.totalAmount, order.currency, locale) })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
