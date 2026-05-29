import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Checkout');
  return { title: t('pageTitle') };
}

export default async function CheckoutPage() {
  return (
    <div className="container py-8">
      {/* <ShippingAddressForm /> */}
      {/* <PaymentMethodSelector /> (Stripe Elements | VNPay) */}
      {/* <OrderSummary /> */}
      {/* <PlaceOrderButton /> */}
    </div>
  );
}
