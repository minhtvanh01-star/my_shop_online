import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CheckoutResultClient } from '@/components/checkout/CheckoutResultClient';
import { ctaClassName } from '@/lib/brand';
import { checkoutResultOutcome } from '@/lib/checkout-result';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Checkout');
  return { title: t('successTitle') };
}

export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: { order?: string; method?: string; redirect_status?: string; ok?: string };
}) {
  const t = await getTranslations('Checkout');
  const orderNumber = searchParams.order;
  const outcome = checkoutResultOutcome(searchParams);
  const failed = outcome === 'failed';
  const succeeded = outcome === 'success';

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <CheckoutResultClient clearOnMount={succeeded && !failed} />
      <h1 className="font-heading text-3xl text-[#064E3B]">
        {failed ? t('paymentFailedTitle') : succeeded ? t('successTitle') : t('processing')}
      </h1>
      <p className="mt-4 text-[#475569]">
        {failed
          ? t('paymentFailedMessage', { number: orderNumber ?? '—' })
          : succeeded && orderNumber
            ? t('successMessage', { number: orderNumber })
            : t('resultPending')}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/orders" className={ctaClassName}>
          {t('viewOrder')}
        </Link>
        {failed ? (
          <Link href="/cart" className="h-11 border border-[#E2E8F0] px-4 leading-[2.75rem] text-sm text-[#064E3B]">
            {t('backToCart')}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
