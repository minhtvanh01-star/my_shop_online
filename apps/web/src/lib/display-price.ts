import { convertUsdForLocale, displayCurrency, parseExchangeRate } from '@/lib/currency';
import { parseAmount, formatMoney } from '@/lib/format-money';

export function formatDisplayPrice(
  usdAmount: string | number | null | undefined,
  locale: string,
  usdToVnd: number,
): string {
  const { amount, currency } = convertUsdForLocale(usdAmount, locale, usdToVnd);
  return formatMoney(amount, currency, locale);
}

export function displayPriceParts(
  usdAmount: string | number | null | undefined,
  locale: string,
  usdToVnd: number,
) {
  return convertUsdForLocale(usdAmount, locale, usdToVnd);
}

export { parseAmount, formatMoney, checkoutCurrency, checkoutCountry } from '@/lib/format-money';
export { displayCurrency, parseExchangeRate, EXCHANGE_RATE_KEY } from '@/lib/currency';
