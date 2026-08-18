'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api, { getApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { ctaClassName } from '@/lib/brand';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isAdminRole, isWarehouseRole, WAREHOUSE_SHIP_NEXT } from '@/lib/roles';
import { useCurrentUser } from '@/stores/authStore';

type ReturnRequest = {
  id: string;
  type: 'refund' | 'exchange';
  status: string;
  reason: string;
  adminNote: string | null;
  createdAt: string;
};

type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  currency?: string;
  subtotal?: string | number;
  shippingFee?: string | number;
  discountAmount?: string | number;
  totalAmount?: string | number;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: string;
  shippingAddress: {
    recipientName?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    countryCode?: string;
  };
  orderItems: {
    id: string;
    productName: string;
    variantLabel: string | null;
    sku: string;
    quantity: number;
    unitPrice?: string | number;
    totalPrice?: string | number;
    currency?: string;
  }[];
  payments?: { id: string; provider: string; status: string }[];
  returnRequests?: ReturnRequest[];
};

const ADMIN_NEXT: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
};

export default function AdminOrderDetailPage() {
  const t = useTranslations('Admin');
  const ordersT = useTranslations('Orders');
  const common = useTranslations('Common');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const warehouse = isWarehouseRole(user?.role);
  const canReview = user?.role === 'SUPPORT' || isAdminRole(user?.role);
  const [tracking, setTracking] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const query = useQuery({
    queryKey: ['admin-order', params.id],
    queryFn: () => api.get<{ data: AdminOrderDetail }>(`/orders/${params.id}`).then((r) => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: (payload: { status: string; trackingNumber?: string }) =>
      api.patch(`/orders/${params.id}/status`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-order', params.id] }),
  });

  const reviewReturn = useMutation({
    mutationFn: ({ returnId, status }: { returnId: string; status: 'approved' | 'rejected' }) =>
      api.patch(`/orders/${params.id}/returns/${returnId}`, {
        status,
        adminNote: adminNote.trim() || undefined,
      }),
    onSuccess: () => {
      setAdminNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-order', params.id] });
    },
  });

  const order = query.data;
  const nextStatuses = warehouse
    ? (WAREHOUSE_SHIP_NEXT[order?.status ?? ''] ?? [])
    : (ADMIN_NEXT[order?.status ?? ''] ?? []);

  if (query.isLoading) {
    return <p className="text-sm text-[#475569]">{common('loading')}</p>;
  }
  if (query.isError || !order) {
    return <p className="text-sm text-[#DC2626]">{ordersT('loadError')}</p>;
  }

  return (
    <div className="max-w-3xl">
      <Link href={`/${locale}/admin/orders`} className="text-sm text-[#059669] underline-offset-4 hover:underline">
        {t('orders')}
      </Link>
      <h1 className="mt-4 font-heading text-2xl text-[#064E3B]">{t('orderDetail')}</h1>
      <p className="mt-1 text-sm text-[#475569]">
        {ordersT('orderNumber', { number: order.orderNumber })} · {ordersT(`status.${order.status}` as 'status.pending')}
      </p>
      <p className="text-sm text-[#475569]">
        {ordersT('placedOn', { date: new Date(order.createdAt).toLocaleDateString(locale) })}
      </p>

      <h2 className="mt-8 font-heading text-lg">{ordersT('items')}</h2>
      <ul className="mt-3 space-y-2">
        {order.orderItems.map((item) => (
          <li key={item.id} className="flex justify-between border-b border-[#E2E8F0] pb-2 text-sm">
            <span>
              {item.productName}
              {item.variantLabel ? ` · ${item.variantLabel}` : ''} · SKU {item.sku} × {item.quantity}
            </span>
            {!warehouse && item.totalPrice != null ? (
              <span>{formatMoney(item.totalPrice, item.currency || order.currency || 'USD', locale)}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {!warehouse && order.totalAmount != null ? (
        <p className="mt-3 font-medium">
          {ordersT('total', { amount: formatMoney(order.totalAmount, order.currency || 'USD', locale) })}
        </p>
      ) : null}

      <h2 className="mt-8 font-heading text-lg">{ordersT('shipping')}</h2>
      <p className="mt-2 text-sm text-[#475569]">
        {order.shippingAddress.recipientName}
        {order.shippingAddress.phone ? ` · ${order.shippingAddress.phone}` : ''}
        <br />
        {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
        {order.shippingAddress.countryCode ? `, ${order.shippingAddress.countryCode}` : ''}
      </p>
      {order.trackingNumber ? (
        <p className="mt-2 text-sm">
          {t('columns.tracking')}: {order.trackingNumber}
        </p>
      ) : null}

      {nextStatuses.includes('shipped') ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            updateStatus.mutate({ status: 'shipped', trackingNumber: tracking.trim() });
          }}
        >
          <div>
            <Label htmlFor="tracking">{t('columns.tracking')}</Label>
            <Input
              id="tracking"
              value={tracking}
              required
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>
          <button type="submit" className={ctaClassName} disabled={updateStatus.isPending}>
            {t('markShipped')}
          </button>
        </form>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              className="h-11 border border-[#E2E8F0] px-4 text-sm text-[#064E3B]"
              onClick={() => updateStatus.mutate({ status })}
              disabled={updateStatus.isPending}
            >
              {ordersT(`status.${status}` as 'status.pending')}
            </button>
          ))}
        </div>
      )}
      {updateStatus.isError ? <p className="mt-2 text-sm text-[#DC2626]">{getApiError(updateStatus.error)}</p> : null}

      <section className="mt-10">
        <h2 className="font-heading text-lg">{t('returns.title')}</h2>
        {(order.returnRequests ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-[#475569]">{t('returns.none')}</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {(order.returnRequests ?? []).map((row) => (
              <li key={row.id} className="border-b border-[#E2E8F0] pb-4 text-sm">
                <p>
                  {row.type === 'exchange' ? ordersT('returnExchange') : ordersT('returnRefund')} ·{' '}
                  {ordersT(`returnStatus.${row.status}` as 'returnStatus.pending')}
                </p>
                <p className="text-[#475569]">{row.reason}</p>
                {row.adminNote ? <p className="text-[#475569]">{row.adminNote}</p> : null}
                {canReview && row.status === 'pending' ? (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`note-${row.id}`}>{t('returns.adminNote')}</Label>
                    <Textarea
                      id={`note-${row.id}`}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      {(isAdminRole(user?.role) || row.type === 'exchange') ? (
                        <button
                          type="button"
                          className={ctaClassName}
                          onClick={() => reviewReturn.mutate({ returnId: row.id, status: 'approved' })}
                        >
                          {t('returns.approve')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="h-11 border border-[#E2E8F0] px-4 text-sm text-[#DC2626]"
                        onClick={() => reviewReturn.mutate({ returnId: row.id, status: 'rejected' })}
                      >
                        {t('returns.reject')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {reviewReturn.isError ? (
          <p className="mt-2 text-sm text-[#DC2626]">{getApiError(reviewReturn.error)}</p>
        ) : null}
      </section>
    </div>
  );
}
