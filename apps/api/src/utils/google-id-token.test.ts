import assert from 'node:assert/strict';
import { test } from 'node:test';
import { googleProfileFromPayload } from './google-profile.ts';

test('googleProfileFromPayload maps a verified Google token payload', () => {
  const profile = googleProfileFromPayload({
    sub: 'gid-1',
    email: 'Ada@Gmail.com',
    email_verified: true,
    name: 'Ada Nguyen',
  });
  assert.deepEqual(profile, {
    providerUserId: 'gid-1',
    email: 'ada@gmail.com',
    emailVerified: true,
    fullName: 'Ada Nguyen',
  });
});

test('googleProfileFromPayload returns null without email or sub', () => {
  assert.equal(googleProfileFromPayload({ email: 'a@b.c' }), null);
  assert.equal(googleProfileFromPayload({ sub: 'x' }), null);
});
