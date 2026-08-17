export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatMoney(
  value: string | number | null | undefined,
  currency: string,
  locale: string,
): string {
  const amount = parseAmount(value);
  const intlLocale = locale.startsWith('vi') ? 'vi-VN' : 'en-US';
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function checkoutCurrency(locale: string): string {
  return locale === 'vi' ? 'VND' : 'USD';
}

export function checkoutCountry(locale: string): string {
  return locale === 'vi' ? 'VN' : 'US';
}
