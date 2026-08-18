'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import api, { getApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { ctaClassName } from '@/lib/brand';
import { ErrorBlock, LoadingBlock } from '@/components/storefront/PageState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { canCreateReturnRequest } from '@/lib/order-return';

type ReturnRequest = {
  id: string;
  type: 'refund' | 'exchange';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
  adminNote: string | null;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotal: string | number;
  shippingFee: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  notes: string | null;
  trackingNumber: string | null;
  deliveredAt: string | null;
  createdAt: string;
  shippingAddress: {
    recipientName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    countryCode?: string;
  };
  orderItems: {
    id: string;
    productName: string;
    variantLabel: string | null;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
    currency: string;
  }[];
  payments: { id: string; provider: string; status: string }[];
  returnRequests?: ReturnRequest[];
};

export default function OrderDetailPage() {
  const t = useTranslations('Orders');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState('');
  const [returnType, setReturnType] = useState<'refund' | 'exchange'>('refund');
  const [returnReason, setReturnReason] = useState('');

  const query = useQuery({
    queryKey: ['order', params.id],
    queryFn: () => api.get<{ data: OrderDetail }>(`/orders/${params.id}`).then((r) => r.data.data),
  });

  const cancel = useMutation({
    mutationFn: () => api.patch(`/orders/${params.id}/cancel`, { reason: cancelReason || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', params.id] }),
  });

  const createReturn = useMutation({
    mutationFn: () =>
      api.post(`/orders/${params.id}/returns`, { type: returnType, reason: returnReason.trim() }),
    onSuccess: () => {
      setReturnReason('');
      queryClient.invalidateQueries({ queryKey: ['order', params.id] });
    },
  });

  const order = query.data;

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <LoadingBlock />
      </div>
    );
  }

  if (query.isError || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorBlock message={t('loadError')} onRetry={() => query.refetch()} />
      </div>
    );
  }

  const pay = order.payments?.[0];
  const returns = order.returnRequests ?? [];
  const hasOpenRequest = returns.some((row) => row.status === 'pending' || row.status === 'approved');
  const showReturnForm = canCreateReturnRequest({
    orderStatus: order.status,
    deliveredAt: order.deliveredAt,
    hasOpenRequest,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/orders" className="text-sm text-[#059669] underline-offset-4 hover:underline">
        {t('backToOrders')}
      </Link>
      <h1 className="mt-4 font-heading text-3xl text-[#064E3B]">
        {t('orderNumber', { number: order.orderNumber })}
      </h1>
      <p className="mt-2 text-sm text-[#475569]">{t(`status.${order.status}` as 'status.pending')}</p>
      {pay ? (
        <p className="text-sm text-[#475569]">
          {t('payment')}: {t(`provider.${pay.provider}` as 'provider.cod')} ·{' '}
          {t(`paymentStatus.${pay.status}` as 'paymentStatus.pending')}
        </p>
      ) : null}
      <p className="mt-2 text-sm">{t('placedOn', { date: new Date(order.createdAt).toLocaleDateString(locale) })}</p>
      {order.trackingNumber ? (
        <p className="text-sm">
          {t('trackOrder')}: {order.trackingNumber}
        </p>
      ) : null}

      <h2 className="mt-8 font-heading text-xl text-[#064E3B]">{t('items')}</h2>
      <ul className="mt-4 space-y-3">
        {order.orderItems.map((item) => (
          <li key={item.id} className="flex justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <p>{item.productName}</p>
              {item.variantLabel ? <p className="text-sm text-[#475569]">{item.variantLabel}</p> : null}
              <p className="text-sm text-[#475569]">× {item.quantity}</p>
            </div>
            <p>{formatMoney(item.totalPrice, item.currency || order.currency, locale)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1 text-sm text-[#475569]">
        <div className="flex justify-between">
          <dt>{t('subtotal')}</dt>
          <dd>{formatMoney(order.subtotal, order.currency, locale)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('discount')}</dt>
          <dd>{formatMoney(order.discountAmount, order.currency, locale)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('shippingFee')}</dt>
          <dd>{formatMoney(order.shippingFee, order.currency, locale)}</dd>
        </div>
      </dl>
      <p className="mt-4 font-medium">
        {t('total', { amount: formatMoney(order.totalAmount, order.currency, locale) })}
      </p>

      <h2 className="mt-8 font-heading text-xl text-[#064E3B]">{t('shipping')}</h2>
      <p className="mt-2 text-sm text-[#475569]">
        {order.shippingAddress.recipientName}
        {order.shippingAddress.phone ? ` · ${order.shippingAddress.phone}` : ''}
        <br />
        {order.shippingAddress.addressLine1}
        {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
        <br />
        {order.shippingAddress.city}
        {order.shippingAddress.countryCode ? `, ${order.shippingAddress.countryCode}` : ''}
      </p>
      {order.notes ? <p className="mt-2 text-sm text-[#475569]">{t('notes')}: {order.notes}</p> : null}

      {returns.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-heading text-xl text-[#064E3B]">{t('returnTitle')}</h2>
          <ul className="mt-3 space-y-3">
            {returns.map((row) => (
              <li key={row.id} className="border-b border-[#E2E8F0] pb-3 text-sm">
                <p>
                  {row.type === 'exchange' ? t('returnExchange') : t('returnRefund')} ·{' '}
                  {t(`returnStatus.${row.status}`)}
                </p>
                <p className="text-[#475569]">{row.reason}</p>
                {row.adminNote ? <p className="text-[#475569]">{row.adminNote}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {order.status === 'pending' ? (
        <form
          className="mt-8 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            cancel.mutate();
          }}
        >
          <div>
            <Label htmlFor="cancel-reason">{t('cancelReason')}</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <button type="submit" className={`${ctaClassName} bg-white text-[#DC2626]`} disabled={cancel.isPending}>
            {t('cancelOrder')}
          </button>
          {cancel.isError ? <p className="text-sm text-[#DC2626]">{getApiError(cancel.error)}</p> : null}
        </form>
      ) : null}

      {showReturnForm ? (
        <form
          className="mt-8 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createReturn.mutate();
          }}
        >
          <h2 className="font-heading text-xl text-[#064E3B]">{t('returnTitle')}</h2>
          <p className="text-sm text-[#475569]">{t('returnLead')}</p>
          <div>
            <Label htmlFor="return-type">{t('returnType')}</Label>
            <Select
              id="return-type"
              value={returnType}
              onChange={(e) => setReturnType(e.target.value as 'refund' | 'exchange')}
            >
              <option value="refund">{t('returnRefund')}</option>
              <option value="exchange">{t('returnExchange')}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="return-reason">{t('returnReason')}</Label>
            <Input
              id="return-reason"
              value={returnReason}
              minLength={8}
              required
              onChange={(e) => setReturnReason(e.target.value)}
            />
          </div>
          <button type="submit" className={ctaClassName} disabled={createReturn.isPending}>
            {t('returnSubmit')}
          </button>
          {createReturn.isSuccess ? <p className="text-sm text-[#059669]">{t('returnSubmitted')}</p> : null}
          {createReturn.isError ? (
            <p className="text-sm text-[#DC2626]">{getApiError(createReturn.error)}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
