'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ListFilterBar, type FilterFieldConfig } from '@/components/list/ListFilterBar';
import { ListPagination } from '@/components/list/ListPagination';
import api, { getApiError } from '@/lib/api';
import type { PaginatedApiResponse } from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { isWarehouseRole, WAREHOUSE_SHIP_NEXT } from '@/lib/roles';
import { useCurrentUser } from '@/stores/authStore';

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  totalAmount?: string | number;
  trackingNumber?: string | null;
  createdAt: string;
};

const ADMIN_NEXT: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  shipped: ['delivered'],
};

const EMPTY_FILTERS = { search: '', status: '' };

export default function AdminOrdersPage() {
  const t = useTranslations('Admin');
  const ordersT = useTranslations('Orders');
  const common = useTranslations('Common');
  const locale = useLocale();
  const user = useCurrentUser();
  const warehouse = isWarehouseRole(user?.role);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const filterFields: FilterFieldConfig[] = useMemo(
    () => [
      {
        key: 'search',
        label: common('search'),
        type: 'search',
        placeholder: t('filters.searchOrderPlaceholder'),
        className: 'min-w-[14rem] flex-[2] space-y-1',
      },
      {
        key: 'status',
        label: t('columns.orderStatus'),
        type: 'select',
        options: warehouse
          ? [
              { value: '', label: t('filters.allStatuses') },
              { value: 'confirmed', label: ordersT('status.confirmed') },
              { value: 'processing', label: ordersT('status.processing') },
              { value: 'shipped', label: ordersT('status.shipped') },
            ]
          : [
              { value: '', label: t('filters.allStatuses') },
              { value: 'pending', label: ordersT('status.pending') },
              { value: 'confirmed', label: ordersT('status.confirmed') },
              { value: 'processing', label: ordersT('status.processing') },
              { value: 'shipped', label: ordersT('status.shipped') },
              { value: 'delivered', label: ordersT('status.delivered') },
              { value: 'cancelled', label: ordersT('status.cancelled') },
              { value: 'refunded', label: ordersT('status.refunded') },
            ],
      },
    ],
    [common, ordersT, t, warehouse],
  );

  const query = useQuery({
    queryKey: ['admin-orders', applied, page, warehouse],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (applied.search) params.search = applied.search;
      if (applied.status) params.status = applied.status;
      return api.get<PaginatedApiResponse<AdminOrder>>('/orders/admin', { params }).then((r) => r.data);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, trackingNumber }: { id: string; status: string; trackingNumber?: string }) =>
      api.patch(`/orders/${id}/status`, {
        status,
        trackingNumber,
      }),
    onSuccess: () => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err) => setFormError(getApiError(err)),
  });

  const rows = query.data?.data ?? [];
  const totalPages = query.data?.meta.totalPages ?? 1;
  const total = query.data?.meta.total ?? 0;
  const nextMap = warehouse ? WAREHOUSE_SHIP_NEXT : ADMIN_NEXT;

  function onStatusClick(order: AdminOrder, status: string) {
    const trackingNumber = (tracking[order.id] ?? order.trackingNumber ?? '').trim();
    if (status === 'shipped' && !trackingNumber) {
      setFormError(t('trackingRequired'));
      return;
    }
    updateStatus.mutate({
      id: order.id,
      status,
      trackingNumber: status === 'shipped' ? trackingNumber || undefined : undefined,
    });
  }

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('orders')}</h1>
      <p className="mt-1 text-sm text-[#475569]">{t('filters.resultsCount', { count: total })}</p>
      {formError ? <p className="mt-3 text-sm text-[#DC2626]">{formError}</p> : null}

      <div className="mt-6">
        <ListFilterBar
          fields={filterFields}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onApply={() => {
            setApplied(filters);
            setPage(1);
          }}
          onClear={() => {
            setFilters(EMPTY_FILTERS);
            setApplied(EMPTY_FILTERS);
            setPage(1);
          }}
          isLoading={query.isFetching}
        />
      </div>

      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.orderNumber')}</TableHead>
              <TableHead>{t('columns.orderStatus')}</TableHead>
              {warehouse ? (
                <TableHead>{t('columns.tracking')}</TableHead>
              ) : (
                <TableHead>{t('columns.total')}</TableHead>
              )}
              <TableHead>{t('columns.date')}</TableHead>
              <TableHead className="text-right">{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-[#475569]">
                  {common('loading')}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-[#475569]">
                  {common('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <a href={`/${locale}/admin/orders/${order.id}`} className="text-[#059669] hover:underline">
                      {order.orderNumber}
                    </a>
                  </TableCell>
                  <TableCell>{ordersT(`status.${order.status}` as 'status.pending')}</TableCell>
                  <TableCell>
                    {warehouse ? (
                      <Input
                        aria-label={t('columns.tracking')}
                        value={tracking[order.id] ?? order.trackingNumber ?? ''}
                        onChange={(event) =>
                          setTracking((prev) => ({ ...prev, [order.id]: event.target.value }))
                        }
                      />
                    ) : (
                      formatMoney(order.totalAmount, order.currency, locale)
                    )}
                  </TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString(locale)}</TableCell>
                  <TableCell className="text-right">
                    <a href={`/${locale}/admin/orders/${order.id}`} className="mr-2 text-sm text-[#059669] hover:underline">
                      {ordersT('viewDetail')}
                    </a>
                    {(nextMap[order.status] ?? []).map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="mr-2 text-sm text-[#059669] hover:underline"
                        onClick={() => onStatusClick(order, status)}
                      >
                        {ordersT(`status.${status}` as 'status.pending')}
                      </button>
                    ))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
