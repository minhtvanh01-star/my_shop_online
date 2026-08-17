'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import api from '@/lib/api';
import type { PaginatedApiResponse } from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { productName } from '@/lib/catalog';

type AdminProduct = {
  id: string;
  slug: string;
  sku: string;
  basePrice: string | number;
  currency: string;
  stockQuantity: number;
  isActive: boolean;
  translations: { name?: string }[];
};

export default function AdminProductsPage() {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-products', locale],
    queryFn: () =>
      api
        .get<PaginatedApiResponse<AdminProduct>>('/products/admin', { params: { locale, limit: 50 } })
        .then((r) => r.data),
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/products/${id}/active`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const rows = query.data?.data ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#064E3B]">{t('products')}</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="py-2">{t('products')}</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>{common('edit')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id} className="border-b border-[#E2E8F0]">
                <td className="py-2">{productName(product)}</td>
                <td>{product.sku}</td>
                <td>{formatMoney(product.basePrice, product.currency, locale)}</td>
                <td>{product.stockQuantity}</td>
                <td>
                  <button
                    type="button"
                    className="text-[#059669]"
                    onClick={() => toggle.mutate({ id: product.id, isActive: !product.isActive })}
                  >
                    {product.isActive ? 'On' : 'Off'}
                  </button>
                  {' · '}
                  <a href={`products/${product.slug}`} className="text-[#059669]">
                    {common('edit')}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
