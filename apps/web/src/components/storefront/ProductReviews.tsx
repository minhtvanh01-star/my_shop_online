'use client';

import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { LoadingBlock, EmptyBlock } from '@/components/storefront/PageState';
import api, { type PaginatedApiResponse } from '@/lib/api';

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { fullName: string };
};

export function ProductReviews({ productId }: { productId: string }) {
  const t = useTranslations('Products');
  const locale = useLocale();
  const query = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () =>
      api
        .get<PaginatedApiResponse<ReviewRow>>(`/reviews?productId=${productId}&limit=10`)
        .then((r) => r.data),
  });

  const items = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const average =
    items.length > 0 ? items.reduce((sum, row) => sum + row.rating, 0) / items.length : 0;

  return (
    <section className="mt-16 border-t border-[#E2E8F0] pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl text-[#064E3B]">{t('reviewsSection')}</h2>
          {total > 0 ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-[#475569]">
              <StarRating value={average} />
              <span>{t('reviews', { count: total })}</span>
            </p>
          ) : null}
        </div>
      </div>

      {query.isLoading ? <LoadingBlock /> : null}
      {!query.isLoading && total === 0 ? (
        <EmptyBlock title={t('noReviews')} description={t('noReviewsLead')} />
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-6 space-y-6">
          {items.map((review) => (
            <li key={review.id} className="border-b border-[#E2E8F0] pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={review.rating} />
                <span className="text-sm font-medium text-[#064E3B]">{review.user.fullName}</span>
                {review.isVerifiedPurchase ? (
                  <span className="text-xs text-[#059669]">{t('verifiedPurchase')}</span>
                ) : null}
              </div>
              {review.title ? <p className="mt-2 font-medium text-[#064E3B]">{review.title}</p> : null}
              {review.body ? <p className="mt-1 text-sm text-[#475569]">{review.body}</p> : null}
              <p className="mt-2 text-xs text-[#475569]">
                {new Date(review.createdAt).toLocaleDateString(locale)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function StarRating({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value.toFixed(1)} stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= rounded ? 'fill-[#EA580C] text-[#EA580C]' : 'text-[#E2E8F0]'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
