import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SHOP_CONFIG_DEFAULTS,
  parseShopConfig,
  paymentMethodsForLocale,
  resolveDisplayCurrency,
  shippingFeeUsd,
} from './shop-config.ts';

test('parseShopConfig uses defaults when empty', () => {
  const config = parseShopConfig([]);
  assert.equal(config.siteName, 'My Shop Online');
  assert.equal(config.usdToVnd, 25000);
  assert.equal(config.returnWindowDays, 7);
  assert.deepEqual(config.allowedCountries, ['VN', 'US']);
  assert.deepEqual(paymentMethodsForLocale('vi', config), ['vnpay', 'stripe', 'cod']);
  assert.deepEqual(paymentMethodsForLocale('en', config), ['stripe']);
});

test('parseShopConfig reads admin values', () => {
  const config = parseShopConfig([
    { key: 'site.name', value: 'Cửa hàng A' },
    { key: 'exchange.usd_to_vnd', value: '24500' },
    { key: 'shipping.flat_fee_usd', value: '4' },
    { key: 'shipping.free_threshold', value: '40' },
    { key: 'payment.cod_enabled', value: 'false' },
    { key: 'payment.vnpay_locales', value: 'vi,en' },
    { key: 'order.return_window_days', value: '14' },
    { key: 'checkout.allowed_countries', value: 'VN, JP' },
    { key: 'checkout.default_country', value: 'jp' },
    { key: 'locale.en_currency', value: 'VND' },
    { key: 'admin.dashboard_currency', value: 'USD' },
  ]);
  assert.equal(config.siteName, 'Cửa hàng A');
  assert.equal(config.usdToVnd, 24500);
  assert.equal(config.shippingFlatFeeUsd, 4);
  assert.equal(config.codEnabled, false);
  assert.deepEqual(config.vnpayLocales, ['vi', 'en']);
  assert.equal(config.returnWindowDays, 14);
  assert.deepEqual(config.allowedCountries, ['VN', 'JP']);
  assert.equal(config.defaultCountry, 'JP');
  assert.equal(resolveDisplayCurrency('en', config), 'VND');
  assert.equal(config.dashboardCurrency, 'USD');
  assert.deepEqual(paymentMethodsForLocale('vi', config), ['vnpay', 'stripe']);
});

test('shippingFeeUsd is free at or above threshold', () => {
  const config = { ...SHOP_CONFIG_DEFAULTS, shippingFlatFeeUsd: 5, shippingFreeThresholdUsd: 50 };
  assert.equal(shippingFeeUsd(49.99, config), 5);
  assert.equal(shippingFeeUsd(50, config), 0);
  assert.equal(shippingFeeUsd(10, { ...config, shippingFlatFeeUsd: 0 }), 0);
});
