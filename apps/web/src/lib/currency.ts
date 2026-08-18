export const EXCHANGE_RATE_KEY = 'exchange.usd_to_vnd';

export function displayCurrency(locale: string): 'VND' | 'USD' {
  return locale.startsWith('vi') ? 'VND' : 'USD';
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
): { amount: number; currency: 'VND' | 'USD' } {
  const usd = typeof usdAmount === 'number' ? usdAmount : Number(usdAmount);
  const base = Number.isFinite(usd) ? usd : 0;
  if (displayCurrency(locale) === 'VND') {
    return { amount: Math.round(base * usdToVnd), currency: 'VND' };
  }
  return { amount: base, currency: 'USD' };
}

export function settingsMap(
  rows: Array<{ key: string; value: string | null }>,
): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value ?? '']));
}
