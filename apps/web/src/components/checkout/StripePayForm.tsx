'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ctaClassName } from '@/lib/brand';
import { getPathname } from '@/i18n/navigation';
import { stripePublishableKey } from '@/lib/payment';

function StripeInner({ locale }: { locale: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('Checkout');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!stripe || !elements) return;
        setBusy(true);
        setError(null);
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}${getPathname({
              href: '/checkout/result',
              locale: locale as 'vi' | 'en',
            })}`,
          },
        });
        if (confirmError) setError(confirmError.message ?? t('processing'));
        setBusy(false);
      }}
    >
      <PaymentElement />
      {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
      <button type="submit" className={ctaClassName} disabled={!stripe || busy}>
        {busy ? t('processing') : t('placeOrder')}
      </button>
    </form>
  );
}

export function StripePayForm({ clientSecret }: { clientSecret: string }) {
  const locale = useLocale();
  const t = useTranslations('Checkout');
  const key = stripePublishableKey();
  const stripePromise = useMemo(() => (key ? loadStripe(key) : null), [key]);

  if (!key || !stripePromise) {
    return <p className="mt-4 text-sm text-[#DC2626]">{t('stripeMissingKey')}</p>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: locale.startsWith('vi') ? 'vi' : 'en',
        appearance: { theme: 'stripe' },
      }}
    >
      <StripeInner locale={locale} />
    </Elements>
  );
}
