import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateOtp, hashOtp, normalizeEmail, otpMatches, parseOtp, serializeOtp } from './otp.ts';

test('generateOtp is 6 digits', () => {
  for (let i = 0; i < 8; i += 1) {
    assert.match(generateOtp(), /^\d{6}$/);
  }
});

test('otpMatches is true for the same code and false otherwise', () => {
  const hash = hashOtp('482910');
  assert.equal(otpMatches('482910', hash), true);
  assert.equal(otpMatches('000000', hash), false);
});

test('parseOtp rejects malformed payloads', () => {
  assert.equal(parseOtp(null), null);
  assert.equal(parseOtp('not-json'), null);
  const ok = { userId: 'u1', hash: 'abc', attempts: 0 };
  assert.deepEqual(parseOtp(serializeOtp(ok)), ok);
});

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Ada@Shop.VN '), 'ada@shop.vn');
});
