export function resolveLocale(value: unknown, fallback = 'en'): 'vi' | 'en' {
  if (value === 'vi' || value === 'en') return value;
  if (typeof value === 'string' && value.startsWith('vi')) return 'vi';
  return fallback === 'vi' ? 'vi' : 'en';
}
