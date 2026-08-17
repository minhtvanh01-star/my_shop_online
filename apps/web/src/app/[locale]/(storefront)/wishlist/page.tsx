'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import api from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { productName } from '@/lib/catalog';

type WishlistRow = {
  id: string;
  productId: string;
  product: {
    id: string;
    slug: string;
    basePrice: string | number;
    currency: string;
    translations: { name?: string }[];
    images: { url: string }[];
  };
};

export default function WishlistPage() {
  const t = useTranslations('Wishlist');
  const common = useTranslations('Common');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['wishlist', locale],
    queryFn: () =>
      api.get<{ data: WishlistRow[] }>('/wishlist', { params: { locale } }).then((r) => r.data.data),
  });
  const remove = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist', locale] }),
  });

  const items = query.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
      {items.length === 0 ? (
        <div className="mt-8">
          <p>{t('empty')}</p>
          <p className="text-sm text-[#475569]">{t('emptyDescription')}</p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={{ pathname: '/products/[slug]', params: { slug: item.product.slug } }}>
                {item.product.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.images[0].url} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square bg-[#E8F1F3]" />
                )}
                <p className="mt-2 text-[#064E3B]">{productName(item.product)}</p>
                <p className="text-sm">{formatMoney(item.product.basePrice, item.product.currency, locale)}</p>
              </Link>
              <button
                type="button"
                className="mt-2 text-sm text-[#DC2626]"
                onClick={() => remove.mutate(item.productId)}
              >
                {common('delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
