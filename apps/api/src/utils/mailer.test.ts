import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSmtpConfigured } from './mailer-config.ts';

test('isSmtpConfigured requires host, user, and pass', () => {
  assert.equal(isSmtpConfigured({}), false);
  assert.equal(isSmtpConfigured({ SMTP_HOST: 'smtp.gmail.com' }), false);
  assert.equal(
    isSmtpConfigured({ SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'a@b.c', SMTP_PASS: 'x' }),
    true,
  );
});
