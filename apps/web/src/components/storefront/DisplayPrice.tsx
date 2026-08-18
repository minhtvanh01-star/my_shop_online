'use client';

import { useLocale } from 'next-intl';
import { formatDisplayPrice } from '@/lib/display-price';
import { useShopSettings } from '@/components/storefront/ShopSettingsProvider';

export function DisplayPrice({ usdAmount }: { usdAmount: string | number | null | undefined }) {
  const locale = useLocale();
  const shop = useShopSettings();
  return <>{formatDisplayPrice(usdAmount, locale, shop.usdToVnd, shop.localeCurrencies)}</>;
}
