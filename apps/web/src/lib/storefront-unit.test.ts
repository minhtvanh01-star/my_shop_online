import assert from 'node:assert/strict';
import { test } from 'node:test';
import { convertUsdForLocale } from './currency.ts';
import { parseAmount, formatMoney, checkoutCurrency } from './format-money.ts';
import { paymentMethodsForLocale, vnpayLocale } from './payment.ts';
import { safeInternalPath } from './safe-path.ts';
import { checkoutResultOutcome } from './checkout-result.ts';
import { productsSearchUrl } from './products-search.ts';
import { canCreateReturnRequest } from './order-return.ts';

test('parseAmount reads Prisma decimal strings', () => {
  assert.equal(parseAmount('199000.0000'), 199000);
  assert.equal(parseAmount(12.5), 12.5);
  assert.equal(parseAmount('nope'), 0);
  assert.equal(parseAmount(null), 0);
});

test('formatMoney uses locale currency formatting', () => {
  const vnd = formatMoney('100000', 'VND', 'vi');
  assert.ok(vnd.includes('100'));
  assert.equal(checkoutCurrency('vi'), 'VND');
  assert.equal(checkoutCurrency('en'), 'USD');
});

test('safeInternalPath blocks open redirects', () => {
  assert.equal(safeInternalPath('https://evil.test'), '/');
  assert.equal(safeInternalPath('//evil.test'), '/');
  assert.equal(safeInternalPath('/vi/thanh-toan'), '/vi/thanh-toan');
  assert.equal(safeInternalPath(null, '/vi'), '/vi');
});

test('convertUsdForLocale uses admin exchange rate', () => {
  assert.equal(convertUsdForLocale(10, 'vi', 25000).amount, 250000);
  assert.equal(convertUsdForLocale(10, 'vi', 25000).currency, 'VND');
  assert.equal(convertUsdForLocale(10, 'en', 25000).amount, 10);
});

test('vnpayLocale maps vi to vn not vi', () => {
  assert.equal(vnpayLocale('vi'), 'vn');
  assert.equal(vnpayLocale('en'), 'en');
  assert.deepEqual(paymentMethodsForLocale('vi'), ['vnpay', 'stripe', 'cod']);
  assert.deepEqual(paymentMethodsForLocale('en'), ['stripe']);
});

test('checkoutResultOutcome honors VNPay ok flag', () => {
  assert.equal(checkoutResultOutcome({ order: 'ORD-1', ok: '0' }), 'failed');
  assert.equal(checkoutResultOutcome({ order: 'ORD-1', ok: '1' }), 'success');
  assert.equal(checkoutResultOutcome({ order: 'ORD-1', method: 'cod' }), 'success');
  assert.equal(checkoutResultOutcome({ order: 'ORD-1', method: 'vnpay' }), 'pending');
  assert.equal(checkoutResultOutcome({ redirect_status: 'failed' }), 'failed');
});

test('productsSearchUrl keeps localized path and query', () => {
  assert.equal(productsSearchUrl('/vi/san-pham', '  áo  '), '/vi/san-pham?q=%C3%A1o');
  assert.equal(productsSearchUrl('/en/products', '   '), '/en/products');
});

test('canCreateReturnRequest is delivered + 7 day window', () => {
  const deliveredAt = new Date('2026-08-10T00:00:00.000Z');
  const now = new Date('2026-08-12T00:00:00.000Z');
  assert.equal(
    canCreateReturnRequest({ orderStatus: 'delivered', deliveredAt, hasOpenRequest: false, now }),
    true,
  );
  assert.equal(
    canCreateReturnRequest({ orderStatus: 'pending', deliveredAt, hasOpenRequest: false, now }),
    false,
  );
});
