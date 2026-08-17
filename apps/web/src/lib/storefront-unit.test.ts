import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAmount, formatMoney, checkoutCurrency } from './format-money.ts';
import { paymentMethodsForLocale, vnpayLocale } from './payment.ts';
import { safeInternalPath } from './safe-path.ts';

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

test('vnpayLocale maps vi to vn not vi', () => {
  assert.equal(vnpayLocale('vi'), 'vn');
  assert.equal(vnpayLocale('en'), 'en');
  assert.deepEqual(paymentMethodsForLocale('vi'), ['vnpay', 'stripe', 'cod']);
  assert.deepEqual(paymentMethodsForLocale('en'), ['stripe']);
});
