'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, getPathname } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StripePayForm } from '@/components/checkout/StripePayForm';
import { ctaClassName } from '@/lib/brand';
import { checkoutCountry, checkoutCurrency, formatMoney } from '@/lib/format-money';
import { getApiError } from '@/lib/api';
import api from '@/lib/api';
import { paymentMethodsForLocale, vnpayLocale, type CheckoutPaymentMethod } from '@/lib/payment';
import { useCartItems, useCartStore, useCartTotal } from '@/stores/cartStore';

type ApiAddress = {
  id: string;
  recipientName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
};

type CreatedOrder = {
  id: string;
  orderNumber: string;
  currency: string;
  totalAmount: string | number;
};

const emptyAddress = {
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  countryCode: 'VN',
};

export function CheckoutWizard() {
  const t = useTranslations('Checkout');
  const cartT = useTranslations('Cart');
  const common = useTranslations('Common');
  const locale = useLocale();
  const items = useCartItems();
  const total = useCartTotal();
  const clearCart = useCartStore((s) => s.clearCart);
  const methods = useMemo(() => paymentMethodsForLocale(locale), [locale]);

  const [step, setStep] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [form, setForm] = useState({ ...emptyAddress, countryCode: checkoutCountry(locale) });
  const [saveAddress, setSaveAddress] = useState(false);
  const [method, setMethod] = useState<CheckoutPaymentMethod>(methods[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const currency = items[0]?.currency ?? checkoutCurrency(locale);

  useEffect(() => {
    api
      .get<{ data: ApiAddress[] }>('/users/me/addresses')
      .then((res) => {
        const list = res.data.data;
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) {
          setSelectedAddressId(def.id);
          setForm({
            recipientName: def.recipientName,
            phone: def.phone ?? '',
            addressLine1: def.addressLine1,
            addressLine2: def.addressLine2 ?? '',
            city: def.city,
            state: def.state ?? '',
            postalCode: def.postalCode ?? '',
            countryCode: def.countryCode,
          });
        }
      })
      .catch(() => {
        /* first-time shopper may have no addresses */
      });
  }, []);

  function shippingPayload() {
    const chosen = selectedAddressId !== 'new' ? addresses.find((a) => a.id === selectedAddressId) : null;
    const src = chosen
      ? {
          recipientName: chosen.recipientName,
          phone: chosen.phone ?? '',
          addressLine1: chosen.addressLine1,
          addressLine2: chosen.addressLine2 ?? '',
          city: chosen.city,
          state: chosen.state ?? '',
          postalCode: chosen.postalCode ?? '',
          countryCode: chosen.countryCode,
        }
      : form;
    return {
      recipientName: src.recipientName.trim(),
      phone: src.phone.trim() || undefined,
      addressLine1: src.addressLine1.trim(),
      addressLine2: src.addressLine2.trim() || undefined,
      city: src.city.trim(),
      state: src.state.trim() || undefined,
      postalCode: src.postalCode.trim() || undefined,
      countryCode: src.countryCode.trim().slice(0, 2).toUpperCase(),
    };
  }

  const addressValid =
    shippingPayload().recipientName &&
    shippingPayload().phone &&
    shippingPayload().addressLine1 &&
    shippingPayload().city &&
    shippingPayload().countryCode.length === 2;

  async function placeOrder() {
    setBusy(true);
    setError(null);
    try {
      const shippingAddress = shippingPayload();
      if (saveAddress && selectedAddressId === 'new') {
        await api.post('/users/me/addresses', { ...shippingAddress, isDefault: addresses.length === 0 });
      }
      const created = await api
        .post<{ data: CreatedOrder }>('/orders', {
          shippingAddress,
          currency,
          locale,
          couponCode: couponCode.trim() || undefined,
        })
        .then((r) => r.data.data);
      setOrder(created);
      clearCart();

      if (method === 'stripe') {
        const intent = await api
          .post<{ data: { clientSecret: string } }>('/payments/stripe/intent', { orderId: created.id })
          .then((r) => r.data.data);
        setClientSecret(intent.clientSecret);
        return;
      }
      if (method === 'vnpay') {
        const pay = await api
          .post<{ data: { paymentUrl: string } }>('/payments/vnpay/create', {
            orderId: created.id,
            locale: vnpayLocale(locale),
          })
          .then((r) => r.data.data);
        window.location.assign(pay.paymentUrl);
        return;
      }
      await api.post('/payments/cod', { orderId: created.id });
      const resultPath = getPathname({ href: '/checkout/result', locale: locale as 'vi' | 'en' });
      window.location.assign(
        `${resultPath}?order=${encodeURIComponent(created.orderNumber)}&method=cod`,
      );
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0 && !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
        <p className="mt-4 text-[#475569]">{cartT('empty')}</p>
        <Link href="/cart" className="mt-4 inline-block text-[#059669] underline">
          {cartT('pageTitle')}
        </Link>
      </div>
    );
  }

  const steps = [t('stepCart'), t('stepShipping'), t('stepPayment'), t('stepConfirm')];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-3xl text-[#064E3B]">{t('pageTitle')}</h1>
      <ol className="mt-6 flex flex-wrap gap-4 text-sm">
        {steps.map((label, index) => (
          <li
            key={label}
            className={step === index + 1 ? 'font-semibold text-[#059669]' : 'text-[#475569]'}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section className="mt-8">
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.cartItemId} className="flex justify-between gap-4 border-b border-[#E2E8F0] pb-3">
                <div>
                  <p className="font-medium text-[#064E3B]">{item.name}</p>
                  {item.variantLabel ? <p className="text-sm text-[#475569]">{item.variantLabel}</p> : null}
                  <p className="text-sm text-[#475569]">× {item.quantity}</p>
                </div>
                <p>{formatMoney(item.price * item.quantity, item.currency, locale)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between text-sm">
            <span>{cartT('subtotal')}</span>
            <span>{formatMoney(total, currency, locale)}</span>
          </div>
          <div className="mt-4">
            <Label htmlFor="coupon">{cartT('coupon')}</Label>
            <Input
              id="coupon"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button type="button" className={`${ctaClassName} mt-6`} onClick={() => setStep(2)}>
            {common('next')}
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-8 space-y-4">
          {addresses.length > 0 ? (
            <ul className="space-y-2">
              {addresses.map((address) => (
                <li key={address.id}>
                  <label className="flex cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                    />
                    <span>
                      {address.recipientName} — {address.addressLine1}, {address.city}
                      {address.isDefault ? ` (${t('defaultAddress')})` : ''}
                    </span>
                  </label>
                </li>
              ))}
              <li>
                <label className="flex cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === 'new'}
                    onChange={() => setSelectedAddressId('new')}
                  />
                  <span>{t('newAddress')}</span>
                </label>
              </li>
            </ul>
          ) : null}

          {selectedAddressId === 'new' || addresses.length === 0 ? (
            <div className="grid gap-3">
              <div>
                <Label htmlFor="recipientName">{t('recipientName')}</Label>
                <Input
                  id="recipientName"
                  autoComplete="name"
                  value={form.recipientName}
                  onChange={(e) => setForm((s) => ({ ...s, recipientName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="addressLine1">{t('addressLine1')}</Label>
                <Input
                  id="addressLine1"
                  autoComplete="street-address"
                  value={form.addressLine1}
                  onChange={(e) => setForm((s) => ({ ...s, addressLine1: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="addressLine2">{t('addressLine2')}</Label>
                <Input
                  id="addressLine2"
                  value={form.addressLine2}
                  onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="city">{t('city')}</Label>
                <Input
                  id="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="state">{t('state')}</Label>
                <Input
                  id="state"
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">{t('postalCode')}</Label>
                <Input
                  id="postalCode"
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="countryCode">{t('countryCode')}</Label>
                <Input
                  id="countryCode"
                  autoComplete="country"
                  maxLength={2}
                  value={form.countryCode}
                  onChange={(e) => setForm((s) => ({ ...s, countryCode: e.target.value.toUpperCase() }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                {t('saveAddress')}
              </label>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button type="button" className="h-11 px-4 text-sm" onClick={() => setStep(1)}>
              {common('back')}
            </button>
            <button
              type="button"
              className={ctaClassName}
              disabled={!addressValid}
              onClick={() => setStep(3)}
            >
              {common('next')}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="mt-8 space-y-3">
          {methods.map((item) => (
            <label key={item} className="flex cursor-pointer gap-2">
              <input type="radio" name="pay" checked={method === item} onChange={() => setMethod(item)} />
              <span>{t(item)}</span>
            </label>
          ))}
          <div className="flex gap-3 pt-4">
            <button type="button" className="h-11 px-4 text-sm" onClick={() => setStep(2)}>
              {common('back')}
            </button>
            <button type="button" className={ctaClassName} onClick={() => setStep(4)}>
              {common('next')}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="mt-8 space-y-4">
          <h2 className="font-heading text-xl">{t('orderSummary')}</h2>
          <p className="text-sm text-[#475569]">
            {shippingPayload().recipientName}, {shippingPayload().addressLine1}, {shippingPayload().city}
          </p>
          <p className="text-sm">{t(method)}</p>
          <p className="font-medium">{formatMoney(total, currency, locale)}</p>
          {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
          {clientSecret ? (
            <StripePayForm clientSecret={clientSecret} />
          ) : (
            <div className="flex gap-3">
              <button type="button" className="h-11 px-4 text-sm" onClick={() => setStep(3)} disabled={busy}>
                {common('back')}
              </button>
              <button type="button" className={ctaClassName} onClick={placeOrder} disabled={busy}>
                {busy ? t('processing') : t('placeOrder')}
              </button>
            </div>
          )}
          {order && method === 'stripe' && !clientSecret ? (
            <p className="text-sm text-[#475569]">{t('processing')}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
