'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LoadingBlock, EmptyBlock } from '@/components/storefront/PageState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api, { getApiError, type PaginatedApiResponse } from '@/lib/api';
import { ctaClassName } from '@/lib/brand';
import { useShopSettings } from '@/components/storefront/ShopSettingsProvider';
import { useIsAuthenticated } from '@/stores/authStore';

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  status: string;
  createdAt: string;
  user: { fullName: string };
};

type ReviewSummary = {
  productId: string;
  count: number;
  average: number;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
};

type MyReviewPayload = {
  review: ReviewRow | null;
  canReview: boolean;
  canEdit: boolean;
  eligibleOrderItemId: string | null;
};

export function ProductReviews({ productId }: { productId: string }) {
  const t = useTranslations('Products');
  const locale = useLocale();
  const pathname = usePathname();
  const shop = useShopSettings();
  const isAuthenticated = useIsAuthenticated();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['reviews', productId],
    enabled: shop.features.reviews,
    queryFn: () =>
      api
        .get<PaginatedApiResponse<ReviewRow>>(`/reviews?productId=${productId}&limit=10`)
        .then((r) => r.data),
  });

  const summaryQuery = useQuery({
    queryKey: ['reviews-summary', productId],
    enabled: shop.features.reviews,
    queryFn: () =>
      api.get<{ data: ReviewSummary }>(`/reviews/summary?productId=${productId}`).then((r) => r.data.data),
  });

  const mineQuery = useQuery({
    queryKey: ['reviews-me', productId],
    enabled: shop.features.reviews && isAuthenticated,
    queryFn: () =>
      api.get<{ data: MyReviewPayload }>(`/reviews/me?productId=${productId}`).then((r) => r.data.data),
  });

  const items = listQuery.data?.data ?? [];
  const summary = summaryQuery.data;
  const mine = mineQuery.data;

  if (!shop.features.reviews) return null;

  return (
    <section className="mt-16 border-t border-[#E2E8F0] pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl text-[#064E3B]">{t('reviewsSection')}</h2>
          {summary && summary.count > 0 ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-[#475569]">
              <StarRating value={summary.average} />
              <span>{t('averageRating', { score: summary.average.toFixed(1) })}</span>
              <span>· {t('reviews', { count: summary.count })}</span>
            </p>
          ) : null}
        </div>
      </div>

      <ReviewForm
        productId={productId}
        isAuthenticated={isAuthenticated}
        loginHref={{ pathname: '/auth/login', query: { redirect: pathname } }}
        mine={mine}
        isMineLoading={mineQuery.isLoading}
        onChanged={() => {
          void queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
          void queryClient.invalidateQueries({ queryKey: ['reviews-summary', productId] });
          void queryClient.invalidateQueries({ queryKey: ['reviews-me', productId] });
        }}
      />

      {listQuery.isLoading ? <LoadingBlock /> : null}
      {!listQuery.isLoading && (summary?.count ?? 0) === 0 ? (
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

function ReviewForm({
  productId,
  isAuthenticated,
  loginHref,
  mine,
  isMineLoading,
  onChanged,
}: {
  productId: string;
  isAuthenticated: boolean;
  loginHref: { pathname: '/auth/login'; query: { redirect: string } };
  mine: MyReviewPayload | undefined;
  isMineLoading: boolean;
  onChanged: () => void;
}) {
  const t = useTranslations('Products');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mine?.review) return;
    setRating(mine.review.rating);
    setTitle(mine.review.title ?? '');
    setBody(mine.review.body ?? '');
  }, [mine?.review]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        productId,
        orderItemId: mine?.eligibleOrderItemId ?? undefined,
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      };
      if (mine?.review) {
        return api.put(`/reviews/${mine.review.id}`, {
          rating: payload.rating,
          title: payload.title,
          body: payload.body,
        });
      }
      return api.post('/reviews', payload);
    },
    onSuccess: () => {
      setError(null);
      onChanged();
    },
    onError: (err) => setError(getApiError(err) || t('reviewError')),
  });

  if (!isAuthenticated) {
    return (
      <p className="mt-6 text-sm text-[#475569]">
        <Link href={loginHref} className="text-[#059669] underline-offset-2 hover:underline">
          {t('reviewLogin')}
        </Link>
      </p>
    );
  }

  if (isMineLoading) return <p className="mt-6 text-sm text-[#475569]">…</p>;

  if (!mine?.canReview && !mine?.canEdit) {
    return <p className="mt-6 text-sm text-[#475569]">{t('reviewNeedPurchase')}</p>;
  }

  return (
    <form
      className="mt-6 max-w-xl space-y-4 rounded-lg border border-[#E2E8F0] bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) {
          setError(t('reviewBody'));
          return;
        }
        save.mutate();
      }}
    >
      <p className="font-medium text-[#064E3B]">{mine?.review ? t('editReview') : t('writeReview')}</p>
      {mine?.review?.status === 'pending' ? (
        <p className="text-sm text-[#475569]">{t('reviewPending')}</p>
      ) : mine?.review ? (
        <p className="text-sm text-[#059669]">{t('reviewThanks')}</p>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[#064E3B]">{t('ratingLabel')}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#059669]"
              aria-pressed={rating === star}
              aria-label={`${star}`}
              onClick={() => setRating(star)}
            >
              <Star
                size={22}
                className={star <= rating ? 'fill-[#EA580C] text-[#EA580C]' : 'text-[#E2E8F0]'}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="review-title">{t('reviewTitle')}</Label>
        <Input id="review-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="review-body">{t('reviewBody')}</Label>
        <Textarea
          id="review-body"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
      <button type="submit" className={ctaClassName} disabled={save.isPending}>
        {mine?.review ? t('reviewUpdate') : t('reviewSubmit')}
      </button>
    </form>
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
