import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ctaClassName } from '@/lib/brand';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Checkout');
  return { title: t('successTitle') };
}

export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: { order?: string; method?: string; redirect_status?: string };
}) {
  const t = await getTranslations('Checkout');
  const orderNumber = searchParams.order;
  const failed = searchParams.redirect_status === 'failed';

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-heading text-3xl text-[#064E3B]">
        {failed ? t('processing') : t('successTitle')}
      </h1>
      <p className="mt-4 text-[#475569]">
        {orderNumber ? t('successMessage', { number: orderNumber }) : t('resultPending')}
      </p>
      <Link href="/orders" className={`${ctaClassName} mt-8`}>
        {t('viewOrder')}
      </Link>
    </div>
  );
}
