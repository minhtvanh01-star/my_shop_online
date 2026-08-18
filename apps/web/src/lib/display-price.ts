import { convertUsdForLocale, type ShopCurrency } from '@/lib/currency';
import { formatMoney } from '@/lib/format-money';

export function formatDisplayPrice(
  usdAmount: string | number | null | undefined,
  locale: string,
  usdToVnd: number,
  localeCurrencies?: { vi: ShopCurrency; en: ShopCurrency },
): string {
  const { amount, currency } = convertUsdForLocale(usdAmount, locale, usdToVnd, localeCurrencies);
  return formatMoney(amount, currency, locale);
}

export function displayPriceParts(
  usdAmount: string | number | null | undefined,
  locale: string,
  usdToVnd: number,
  localeCurrencies?: { vi: ShopCurrency; en: ShopCurrency },
) {
  return convertUsdForLocale(usdAmount, locale, usdToVnd, localeCurrencies);
}

export { parseAmount, formatMoney, checkoutCurrency, checkoutCountry } from '@/lib/format-money';
export { displayCurrency, parseExchangeRate, EXCHANGE_RATE_KEY } from '@/lib/currency';
