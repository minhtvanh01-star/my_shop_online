import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signedStockDelta } from './inventory-delta.ts';

test('purchase always increases stock', () => {
  assert.equal(signedStockDelta('purchase', 10), 10);
});

test('damage always decreases stock', () => {
  assert.equal(signedStockDelta('damage', 3), -3);
});

test('adjustment uses direction', () => {
  assert.equal(signedStockDelta('adjustment', 4, 'in'), 4);
  assert.equal(signedStockDelta('adjustment', 4, 'out'), -4);
});

test('rejects non-positive quantity and missing adjustment direction', () => {
  assert.throws(() => signedStockDelta('purchase', 0), RangeError);
  assert.throws(() => signedStockDelta('adjustment', 2), RangeError);
});
