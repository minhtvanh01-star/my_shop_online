import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toStripeAmount } from './money.ts';
import { resolveLocale } from './locale.ts';

test('toStripeAmount uses major units for VND', () => {
  assert.equal(toStripeAmount(199000, 'VND'), 199000);
  assert.equal(toStripeAmount(12.5, 'USD'), 1250);
});

test('resolveLocale accepts vi/en only', () => {
  assert.equal(resolveLocale('vi'), 'vi');
  assert.equal(resolveLocale('en'), 'en');
  assert.equal(resolveLocale('fr'), 'en');
});
