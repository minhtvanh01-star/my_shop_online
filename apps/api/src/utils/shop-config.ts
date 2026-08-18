export const SHOP_SETTING_KEYS = {
  siteName: 'site.name',
  catalogCurrency: 'site.currency_default',
  exchangeUsdToVnd: 'exchange.usd_to_vnd',
  shippingFlatFeeUsd: 'shipping.flat_fee_usd',
  shippingFreeThresholdUsd: 'shipping.free_threshold',
  stripeEnabled: 'payment.stripe_enabled',
  vnpayEnabled: 'payment.vnpay_enabled',
  codEnabled: 'payment.cod_enabled',
  stripeLocales: 'payment.stripe_locales',
  vnpayLocales: 'payment.vnpay_locales',
  codLocales: 'payment.cod_locales',
  returnWindowDays: 'order.return_window_days',
  orderMaxItems: 'order.max_items',
  mediaMaxFileSizeMb: 'media.max_file_size_mb',
  accessTokenTtlS: 'auth.access_token_ttl_s',
  refreshTokenTtlD: 'auth.refresh_token_ttl_d',
  defaultCountry: 'checkout.default_country',
  allowedCountries: 'checkout.allowed_countries',
  localeViCurrency: 'locale.vi_currency',
  localeEnCurrency: 'locale.en_currency',
  dashboardCurrency: 'admin.dashboard_currency',
  rateLimitMax: 'api.rate_limit_max',
  rateLimitWindowMin: 'api.rate_limit_window_min',
} as const;

export type ShopCurrency = 'VND' | 'USD';
export type CheckoutPaymentMethod = 'stripe' | 'vnpay' | 'cod';

export type ShopConfig = {
  siteName: string;
  catalogCurrency: ShopCurrency;
  usdToVnd: number;
  shippingFlatFeeUsd: number;
  shippingFreeThresholdUsd: number;
  stripeEnabled: boolean;
  vnpayEnabled: boolean;
  codEnabled: boolean;
  stripeLocales: string[];
  vnpayLocales: string[];
  codLocales: string[];
  returnWindowDays: number;
  orderMaxItems: number;
  mediaMaxFileSizeMb: number;
  accessTokenTtlS: number;
  refreshTokenTtlD: number;
  defaultCountry: string;
  allowedCountries: string[];
  localeCurrencies: { vi: ShopCurrency; en: ShopCurrency };
  dashboardCurrency: ShopCurrency;
  rateLimitMax: number;
  rateLimitWindowMin: number;
};

export const SHOP_CONFIG_DEFAULTS: ShopConfig = {
  siteName: 'My Shop Online',
  catalogCurrency: 'USD',
  usdToVnd: 25000,
  shippingFlatFeeUsd: 0,
  shippingFreeThresholdUsd: 50,
  stripeEnabled: true,
  vnpayEnabled: true,
  codEnabled: true,
  stripeLocales: ['vi', 'en'],
  vnpayLocales: ['vi'],
  codLocales: ['vi'],
  returnWindowDays: 7,
  orderMaxItems: 50,
  mediaMaxFileSizeMb: 5,
  accessTokenTtlS: 900,
  refreshTokenTtlD: 7,
  defaultCountry: 'VN',
  allowedCountries: ['VN', 'US'],
  localeCurrencies: { vi: 'VND', en: 'USD' },
  dashboardCurrency: 'VND',
  rateLimitMax: 200,
  rateLimitWindowMin: 15,
};

type SettingRow = { key: string; value: string | null };

function mapFrom(rows: SettingRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value ?? '']));
}

export function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function parsePositiveNumber(value: string | undefined, fallback: number, opts?: { integer?: boolean; min?: number }): number {
  const n = Number(value);
  const min = opts?.min ?? (opts?.integer ? 1 : 0);
  if (!Number.isFinite(n) || n < min) return fallback;
  return opts?.integer ? Math.round(n) : n;
}

export function parseCurrency(value: string | undefined, fallback: ShopCurrency): ShopCurrency {
  const code = (value ?? '').trim().toUpperCase();
  return code === 'VND' || code === 'USD' ? code : fallback;
}

export function parseCountryList(value: string | undefined, fallback: string[]): string[] {
  const parts = (value ?? '')
    .split(/[,\s]+/)
    .map((part) => part.trim().toUpperCase())
    .filter((part) => /^[A-Z]{2}$/.test(part));
  return parts.length > 0 ? [...new Set(parts)] : fallback;
}

export function parseLocaleList(value: string | undefined, fallback: string[]): string[] {
  const parts = (value ?? '')
    .split(/[,\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part === 'vi' || part === 'en');
  return parts.length > 0 ? [...new Set(parts)] : fallback;
}

export function localeKey(locale: string): 'vi' | 'en' {
  return locale.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function parseShopConfig(rows: SettingRow[]): ShopConfig {
  const map = mapFrom(rows);
  const d = SHOP_CONFIG_DEFAULTS;
  const allowedCountries = parseCountryList(map[SHOP_SETTING_KEYS.allowedCountries], d.allowedCountries);
  const defaultCountryRaw = (map[SHOP_SETTING_KEYS.defaultCountry] ?? d.defaultCountry).trim().toUpperCase();
  const defaultCountry = /^[A-Z]{2}$/.test(defaultCountryRaw)
    ? defaultCountryRaw
    : d.defaultCountry;

  return {
    siteName: map[SHOP_SETTING_KEYS.siteName]?.trim() || d.siteName,
    catalogCurrency: parseCurrency(map[SHOP_SETTING_KEYS.catalogCurrency], d.catalogCurrency),
    usdToVnd: parsePositiveNumber(map[SHOP_SETTING_KEYS.exchangeUsdToVnd], d.usdToVnd, { min: 1 }),
    shippingFlatFeeUsd: parsePositiveNumber(map[SHOP_SETTING_KEYS.shippingFlatFeeUsd], d.shippingFlatFeeUsd, { min: 0 }),
    shippingFreeThresholdUsd: parsePositiveNumber(
      map[SHOP_SETTING_KEYS.shippingFreeThresholdUsd],
      d.shippingFreeThresholdUsd,
      { min: 0 },
    ),
    stripeEnabled: parseBool(map[SHOP_SETTING_KEYS.stripeEnabled], d.stripeEnabled),
    vnpayEnabled: parseBool(map[SHOP_SETTING_KEYS.vnpayEnabled], d.vnpayEnabled),
    codEnabled: parseBool(map[SHOP_SETTING_KEYS.codEnabled], d.codEnabled),
    stripeLocales: parseLocaleList(map[SHOP_SETTING_KEYS.stripeLocales], d.stripeLocales),
    vnpayLocales: parseLocaleList(map[SHOP_SETTING_KEYS.vnpayLocales], d.vnpayLocales),
    codLocales: parseLocaleList(map[SHOP_SETTING_KEYS.codLocales], d.codLocales),
    returnWindowDays: parsePositiveNumber(map[SHOP_SETTING_KEYS.returnWindowDays], d.returnWindowDays, {
      integer: true,
      min: 1,
    }),
    orderMaxItems: parsePositiveNumber(map[SHOP_SETTING_KEYS.orderMaxItems], d.orderMaxItems, {
      integer: true,
      min: 1,
    }),
    mediaMaxFileSizeMb: parsePositiveNumber(map[SHOP_SETTING_KEYS.mediaMaxFileSizeMb], d.mediaMaxFileSizeMb, {
      integer: true,
      min: 1,
    }),
    accessTokenTtlS: parsePositiveNumber(map[SHOP_SETTING_KEYS.accessTokenTtlS], d.accessTokenTtlS, {
      integer: true,
      min: 60,
    }),
    refreshTokenTtlD: parsePositiveNumber(map[SHOP_SETTING_KEYS.refreshTokenTtlD], d.refreshTokenTtlD, {
      integer: true,
      min: 1,
    }),
    defaultCountry: allowedCountries.includes(defaultCountry) ? defaultCountry : allowedCountries[0] ?? d.defaultCountry,
    allowedCountries,
    localeCurrencies: {
      vi: parseCurrency(map[SHOP_SETTING_KEYS.localeViCurrency], d.localeCurrencies.vi),
      en: parseCurrency(map[SHOP_SETTING_KEYS.localeEnCurrency], d.localeCurrencies.en),
    },
    dashboardCurrency: parseCurrency(map[SHOP_SETTING_KEYS.dashboardCurrency], d.dashboardCurrency),
    rateLimitMax: parsePositiveNumber(map[SHOP_SETTING_KEYS.rateLimitMax], d.rateLimitMax, {
      integer: true,
      min: 1,
    }),
    rateLimitWindowMin: parsePositiveNumber(map[SHOP_SETTING_KEYS.rateLimitWindowMin], d.rateLimitWindowMin, {
      integer: true,
      min: 1,
    }),
  };
}

export function resolveDisplayCurrency(locale: string, config: Pick<ShopConfig, 'localeCurrencies'>): ShopCurrency {
  return config.localeCurrencies[localeKey(locale)];
}

export function paymentMethodsForLocale(
  locale: string,
  config: Pick<
    ShopConfig,
    'stripeEnabled' | 'vnpayEnabled' | 'codEnabled' | 'stripeLocales' | 'vnpayLocales' | 'codLocales'
  >,
): CheckoutPaymentMethod[] {
  const key = localeKey(locale);
  const methods: CheckoutPaymentMethod[] = [];
  if (config.vnpayEnabled && config.vnpayLocales.includes(key)) methods.push('vnpay');
  if (config.stripeEnabled && config.stripeLocales.includes(key)) methods.push('stripe');
  if (config.codEnabled && config.codLocales.includes(key)) methods.push('cod');
  return methods;
}

export function shippingFeeUsd(subtotalUsd: number, config: Pick<ShopConfig, 'shippingFlatFeeUsd' | 'shippingFreeThresholdUsd'>): number {
  if (config.shippingFlatFeeUsd <= 0) return 0;
  if (config.shippingFreeThresholdUsd > 0 && subtotalUsd >= config.shippingFreeThresholdUsd) return 0;
  return config.shippingFlatFeeUsd;
}

let cache: { value: ShopConfig; expiresAt: number } | null = null;
const CACHE_MS = 10_000;

export function invalidateShopConfigCache(): void {
  cache = null;
}

export async function getShopConfig(): Promise<ShopConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const { prisma } = await import('../config/database.js');
  const rows = await prisma.systemConfig.findMany({
    where: { isActive: true },
    select: { key: true, value: true },
  });
  const value = parseShopConfig(rows);
  cache = { value, expiresAt: now + CACHE_MS };
  return value;
}
