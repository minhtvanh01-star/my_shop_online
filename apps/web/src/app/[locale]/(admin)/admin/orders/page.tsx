'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import api from '@/lib/api';
import type { PaginatedApiResponse } from '@/lib/api';
import { formatMoney } from '@/lib/format-money';

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  totalAmount: string | number;
  createdAt: string;
};

const NEXT: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['refunded'],
};

export default function AdminOrdersPage() {
  const t = useTranslations('Admin');
  const ordersT = useTranslations('Orders');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get<PaginatedApiResponse<AdminOrder>>('/orders/admin').then((r) => r.data),
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const rows = query.data?.data ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('orders')}</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="py-2">{t('orders')}</th>
              <th>Status</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className="border-b border-[#E2E8F0]">
                <td className="py-2">{order.orderNumber}</td>
                <td>{ordersT(`status.${order.status}` as 'status.pending')}</td>
                <td>{formatMoney(order.totalAmount, order.currency, locale)}</td>
                <td>
                  {(NEXT[order.status] ?? []).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="mr-2 text-[#059669]"
                      onClick={() => updateStatus.mutate({ id: order.id, status })}
                    >
                      {ordersT(`status.${status}` as 'status.pending')}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
