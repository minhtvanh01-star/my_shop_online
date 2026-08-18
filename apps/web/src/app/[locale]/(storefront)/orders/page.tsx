'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/storefront/PageState';
import { ListPagination } from '@/components/list/ListPagination';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ctaClassName } from '@/lib/brand';
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

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

export default function OrdersPage() {
  const t = useTranslations('Orders');
  const common = useTranslations('Common');
  const locale = useLocale();
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['orders', applied, page],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (applied) params.status = applied;
      return api.get<PaginatedApiResponse<OrderRow>>('/orders', { params }).then((r) => r.data);
    },
  });

  const items = query.data?.data ?? [];
  const totalPages = query.data?.meta.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(status);
          setPage(1);
        }}
      >
        <div className="min-w-[12rem] space-y-1">
          <Label htmlFor="order-status">{t('allStatuses')}</Label>
          <Select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('allStatuses')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`status.${value}`)}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className={ctaClassName}>
          {common('filter')}
        </button>
      </form>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? (
        <ErrorBlock message={t('loadError')} onRetry={() => query.refetch()} />
      ) : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <EmptyBlock
          title={t('empty')}
          action={
            <Link href="/products" className={ctaClassName}>
              {t('shopNow')}
            </Link>
          }
        />
      ) : null}
      {items.length > 0 ? (
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
              <Link
                href={{ pathname: '/orders/[id]', params: { id: order.id } }}
                className="mt-1 inline-block text-sm text-[#059669] underline-offset-4 hover:underline"
              >
                {t('viewDetail')}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
