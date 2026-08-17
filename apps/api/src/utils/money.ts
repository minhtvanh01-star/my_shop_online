const ZERO_DECIMAL = new Set(['VND', 'JPY', 'KRW']);

export function toStripeAmount(amount: number, currency: string): number {
  const rounded = Math.round(amount);
  if (ZERO_DECIMAL.has(currency.toUpperCase())) return rounded;
  return Math.round(amount * 100);
}
