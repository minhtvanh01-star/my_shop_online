export const EXCHANGE_RATE_KEY = 'exchange.usd_to_vnd';

export function parseExchangeRate(value: string | null | undefined, fallback = 25000): number {
  if (value == null || String(value).trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Convert a catalog amount into the checkout currency. Catalog is usually USD. */
export function convertCatalogAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  usdToVnd: number,
): number {
  const from = fromCurrency.trim().toUpperCase() || 'USD';
  const to = toCurrency.trim().toUpperCase() || 'USD';
  const value = Number.isFinite(amount) ? amount : 0;
  if (from === to) return to === 'VND' ? Math.round(value) : value;
  if (from === 'USD' && to === 'VND') return Math.round(value * usdToVnd);
  if (from === 'VND' && to === 'USD') return usdToVnd > 0 ? value / usdToVnd : value;
  return value;
}

export function resolveOrderCurrency(locale: string, requested?: string): 'VND' | 'USD' {
  if (locale.toLowerCase().startsWith('vi')) return 'VND';
  const code = (requested ?? 'USD').toUpperCase();
  return code === 'VND' ? 'VND' : 'USD';
}
