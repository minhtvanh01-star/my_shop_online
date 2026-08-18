export type ShopCurrency = 'VND' | 'USD';

export const EXCHANGE_RATE_KEY = 'exchange.usd_to_vnd';

export function displayCurrency(
  locale: string,
  localeCurrencies?: { vi: ShopCurrency; en: ShopCurrency },
): ShopCurrency {
  const key = locale.toLowerCase().startsWith('vi') ? 'vi' : 'en';
  if (localeCurrencies) return localeCurrencies[key];
  return key === 'vi' ? 'VND' : 'USD';
}

export function parseExchangeRate(value: string | number | null | undefined, fallback = 25000): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Base catalog prices are stored in USD. */
export function convertUsdForLocale(
  usdAmount: string | number | null | undefined,
  locale: string,
  usdToVnd: number,
  localeCurrencies?: { vi: ShopCurrency; en: ShopCurrency },
): { amount: number; currency: ShopCurrency } {
  const usd = typeof usdAmount === 'number' ? usdAmount : Number(usdAmount);
  const base = Number.isFinite(usd) ? usd : 0;
  if (displayCurrency(locale, localeCurrencies) === 'VND') {
    return { amount: Math.round(base * usdToVnd), currency: 'VND' };
  }
  return { amount: base, currency: 'USD' };
}

export function settingsMap(
  rows: Array<{ key: string; value: string | null }>,
): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value ?? '']));
}
