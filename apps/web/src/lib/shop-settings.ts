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

export const FEATURE_KEYS = {
  reviews: 'feature.review_system',
  wishlist: 'feature.wishlist',
  blog: 'feature.blog',
  coupon: 'feature.coupon',
  multiCurrency: 'feature.multi_currency',
} as const;

export type ShopCurrency = 'VND' | 'USD';
export type CheckoutPaymentMethod = 'stripe' | 'vnpay' | 'cod';

export type ShopSettings = {
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
  features: {
    reviews: boolean;
    wishlist: boolean;
    blog: boolean;
    coupon: boolean;
    multiCurrency: boolean;
  };
};

export const SHOP_SETTINGS_DEFAULTS: ShopSettings = {
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
  features: {
    reviews: true,
    wishlist: true,
    blog: true,
    coupon: false,
    multiCurrency: false,
  },
};

type SettingRow = { key: string; value: string | null };
type FlagRow = { key: string; isEnabled: boolean };

function mapFrom(rows: SettingRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value ?? '']));
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parsePositiveNumber(value: string | undefined, fallback: number, opts?: { integer?: boolean; min?: number }): number {
  const n = Number(value);
  const min = opts?.min ?? 0;
  if (!Number.isFinite(n) || n < min) return fallback;
  return opts?.integer ? Math.round(n) : n;
}

function parseCurrency(value: string | undefined, fallback: ShopCurrency): ShopCurrency {
  const code = (value ?? '').trim().toUpperCase();
  return code === 'VND' || code === 'USD' ? code : fallback;
}

function parseCountryList(value: string | undefined, fallback: string[]): string[] {
  const parts = (value ?? '')
    .split(/[,\s]+/)
    .map((part) => part.trim().toUpperCase())
    .filter((part) => /^[A-Z]{2}$/.test(part));
  return parts.length > 0 ? [...new Set(parts)] : fallback;
}

function parseLocaleList(value: string | undefined, fallback: string[]): string[] {
  const parts = (value ?? '')
    .split(/[,\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part === 'vi' || part === 'en');
  return parts.length > 0 ? [...new Set(parts)] : fallback;
}

export function localeKey(locale: string): 'vi' | 'en' {
  return locale.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function parseShopSettings(rows: SettingRow[], flags: FlagRow[] = []): ShopSettings {
  const map = mapFrom(rows);
  const d = SHOP_SETTINGS_DEFAULTS;
  const allowedCountries = parseCountryList(map[SHOP_SETTING_KEYS.allowedCountries], d.allowedCountries);
  const defaultCountryRaw = (map[SHOP_SETTING_KEYS.defaultCountry] ?? d.defaultCountry).trim().toUpperCase();
  const defaultCountry = /^[A-Z]{2}$/.test(defaultCountryRaw) ? defaultCountryRaw : d.defaultCountry;
  const flagMap = Object.fromEntries(flags.map((row) => [row.key, row.isEnabled]));

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
    features: {
      reviews: flagMap[FEATURE_KEYS.reviews] ?? d.features.reviews,
      wishlist: flagMap[FEATURE_KEYS.wishlist] ?? d.features.wishlist,
      blog: flagMap[FEATURE_KEYS.blog] ?? d.features.blog,
      coupon: flagMap[FEATURE_KEYS.coupon] ?? d.features.coupon,
      multiCurrency: flagMap[FEATURE_KEYS.multiCurrency] ?? d.features.multiCurrency,
    },
  };
}

export function displayCurrencyForLocale(locale: string, settings: Pick<ShopSettings, 'localeCurrencies'>): ShopCurrency {
  return settings.localeCurrencies[localeKey(locale)];
}

export function paymentMethodsForSettings(
  locale: string,
  settings: Pick<
    ShopSettings,
    'stripeEnabled' | 'vnpayEnabled' | 'codEnabled' | 'stripeLocales' | 'vnpayLocales' | 'codLocales'
  >,
): CheckoutPaymentMethod[] {
  const key = localeKey(locale);
  const methods: CheckoutPaymentMethod[] = [];
  if (settings.vnpayEnabled && settings.vnpayLocales.includes(key)) methods.push('vnpay');
  if (settings.stripeEnabled && settings.stripeLocales.includes(key)) methods.push('stripe');
  if (settings.codEnabled && settings.codLocales.includes(key)) methods.push('cod');
  return methods;
}

export function shippingFeeUsd(
  subtotalUsd: number,
  settings: Pick<ShopSettings, 'shippingFlatFeeUsd' | 'shippingFreeThresholdUsd'>,
): number {
  if (settings.shippingFlatFeeUsd <= 0) return 0;
  if (settings.shippingFreeThresholdUsd > 0 && subtotalUsd >= settings.shippingFreeThresholdUsd) return 0;
  return settings.shippingFlatFeeUsd;
}

export function settingValue(settings: ShopSettings, key: string): string {
  switch (key) {
    case SHOP_SETTING_KEYS.siteName:
      return settings.siteName;
    case SHOP_SETTING_KEYS.catalogCurrency:
      return settings.catalogCurrency;
    case SHOP_SETTING_KEYS.exchangeUsdToVnd:
      return String(settings.usdToVnd);
    case SHOP_SETTING_KEYS.shippingFlatFeeUsd:
      return String(settings.shippingFlatFeeUsd);
    case SHOP_SETTING_KEYS.shippingFreeThresholdUsd:
      return String(settings.shippingFreeThresholdUsd);
    case SHOP_SETTING_KEYS.stripeEnabled:
      return String(settings.stripeEnabled);
    case SHOP_SETTING_KEYS.vnpayEnabled:
      return String(settings.vnpayEnabled);
    case SHOP_SETTING_KEYS.codEnabled:
      return String(settings.codEnabled);
    case SHOP_SETTING_KEYS.stripeLocales:
      return settings.stripeLocales.join(',');
    case SHOP_SETTING_KEYS.vnpayLocales:
      return settings.vnpayLocales.join(',');
    case SHOP_SETTING_KEYS.codLocales:
      return settings.codLocales.join(',');
    case SHOP_SETTING_KEYS.returnWindowDays:
      return String(settings.returnWindowDays);
    case SHOP_SETTING_KEYS.orderMaxItems:
      return String(settings.orderMaxItems);
    case SHOP_SETTING_KEYS.mediaMaxFileSizeMb:
      return String(settings.mediaMaxFileSizeMb);
    case SHOP_SETTING_KEYS.accessTokenTtlS:
      return String(settings.accessTokenTtlS);
    case SHOP_SETTING_KEYS.refreshTokenTtlD:
      return String(settings.refreshTokenTtlD);
    case SHOP_SETTING_KEYS.defaultCountry:
      return settings.defaultCountry;
    case SHOP_SETTING_KEYS.allowedCountries:
      return settings.allowedCountries.join(',');
    case SHOP_SETTING_KEYS.localeViCurrency:
      return settings.localeCurrencies.vi;
    case SHOP_SETTING_KEYS.localeEnCurrency:
      return settings.localeCurrencies.en;
    case SHOP_SETTING_KEYS.dashboardCurrency:
      return settings.dashboardCurrency;
    case SHOP_SETTING_KEYS.rateLimitMax:
      return String(settings.rateLimitMax);
    case SHOP_SETTING_KEYS.rateLimitWindowMin:
      return String(settings.rateLimitWindowMin);
    default:
      return '';
  }
}
