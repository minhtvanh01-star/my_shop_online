'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import api, { getApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { ctaClassName } from '@/lib/brand';

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotal: string | number;
  shippingFee: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  trackingNumber: string | null;
  createdAt: string;
  shippingAddress: {
    recipientName?: string;
    addressLine1?: string;
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
};

export default function OrderDetailPage() {
  const t = useTranslations('Orders');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['order', params.id],
    queryFn: () => api.get<{ data: OrderDetail }>(`/orders/${params.id}`).then((r) => r.data.data),
  });
  const cancel = useMutation({
    mutationFn: () => api.patch(`/orders/${params.id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', params.id] }),
  });

  const order = query.data;
  if (!order) return <div className="px-4 py-10 text-sm text-[#475569]">{t('empty')}</div>;

  const pay = order.payments[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">
        {t('orderNumber', { number: order.orderNumber })}
      </h1>
      <p className="mt-2 text-sm text-[#475569]">{t(`status.${order.status}` as 'status.pending')}</p>
      {pay ? (
        <p className="text-sm text-[#475569]">{t(`paymentStatus.${pay.status}` as 'paymentStatus.pending')}</p>
      ) : null}
      <p className="mt-2 text-sm">{t('placedOn', { date: new Date(order.createdAt).toLocaleDateString(locale) })}</p>
      {order.trackingNumber ? <p className="text-sm">{t('trackOrder')}: {order.trackingNumber}</p> : null}

      <ul className="mt-8 space-y-3">
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
      <p className="mt-4 font-medium">
        {t('total', { amount: formatMoney(order.totalAmount, order.currency, locale) })}
      </p>
      <p className="mt-4 text-sm text-[#475569]">
        {order.shippingAddress.recipientName}, {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
      </p>
      {order.status === 'pending' ? (
        <button
          type="button"
          className={`${ctaClassName} mt-6 bg-white text-[#DC2626]`}
          onClick={() => cancel.mutate()}
        >
          {t('cancelOrder')}
        </button>
      ) : null}
      {cancel.isError ? <p className="mt-2 text-sm text-[#DC2626]">{getApiError(cancel.error)}</p> : null}
    </div>
  );
}
