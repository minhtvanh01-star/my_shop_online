import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  auditLogListWhere,
  extractCreatedId,
  redactAuditValue,
  resolveAuditResourceId,
} from './audit-log.ts';

test('redactAuditValue hides secrets and keeps other fields', () => {
  const out = redactAuditValue({
    email: 'staff@example.com',
    password: 'secret',
    nested: { accessToken: 'abc', sku: 'REAL-SKU' },
  }) as Record<string, unknown>;
  assert.equal(out.email, 'staff@example.com');
  assert.equal(out.password, '[redacted]');
  const nested = out.nested as Record<string, unknown>;
  assert.equal(nested.accessToken, '[redacted]');
  assert.equal(nested.sku, 'REAL-SKU');
});

test('extractCreatedId reads id from created payload only', () => {
  assert.equal(extractCreatedId({ data: { id: 'uuid-1', sku: 'A' } }), 'uuid-1');
  assert.equal(extractCreatedId({ data: [{ id: 'uuid-1' }] }), null);
  assert.equal(extractCreatedId({ data: { sku: 'A' } }), null);
});

test('resolveAuditResourceId prefers route params then body productId', () => {
  assert.equal(
    resolveAuditResourceId({ id: 'order-1' }, { productId: 'p1' }, 'created-1'),
    'order-1',
  );
  assert.equal(resolveAuditResourceId({ key: 'usd_vnd' }, {}, undefined, 'key'), 'usd_vnd');
  assert.equal(resolveAuditResourceId({}, { productId: 'p1' }, undefined), 'p1');
  assert.equal(resolveAuditResourceId({}, {}, 'created-1'), 'created-1');
});

test('auditLogListWhere hides sensitive rows from non-super-admin', () => {
  const admin = auditLogListWhere('ADMIN', { action: 'UPDATE_SETTING' });
  assert.equal(admin.isSensitive, false);
  assert.equal(admin.action, 'UPDATE_SETTING');
  const superAdmin = auditLogListWhere('SUPER_ADMIN', {});
  assert.equal(superAdmin.isSensitive, undefined);
});
