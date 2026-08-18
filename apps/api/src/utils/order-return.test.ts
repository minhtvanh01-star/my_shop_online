import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canCreateReturnRequest, isWithinReturnWindow } from './order-return.ts';

test('isWithinReturnWindow is 7 days from delivery', () => {
  const delivered = new Date('2026-08-01T00:00:00.000Z');
  assert.equal(isWithinReturnWindow(delivered, new Date('2026-08-08T00:00:00.000Z')), true);
  assert.equal(isWithinReturnWindow(delivered, new Date('2026-08-08T00:00:00.001Z')), false);
  assert.equal(isWithinReturnWindow(null, new Date()), false);
});

test('canCreateReturnRequest only for delivered orders without an open request', () => {
  const deliveredAt = new Date('2026-08-10T00:00:00.000Z');
  const now = new Date('2026-08-12T00:00:00.000Z');
  assert.equal(
    canCreateReturnRequest({ orderStatus: 'delivered', deliveredAt, hasOpenRequest: false, now }),
    true,
  );
  assert.equal(
    canCreateReturnRequest({ orderStatus: 'shipped', deliveredAt, hasOpenRequest: false, now }),
    false,
  );
  assert.equal(
    canCreateReturnRequest({ orderStatus: 'delivered', deliveredAt, hasOpenRequest: true, now }),
    false,
  );
});
