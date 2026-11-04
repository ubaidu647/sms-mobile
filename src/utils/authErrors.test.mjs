import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_REFUSAL_FALLBACK,
  isPasswordChangeRequired,
  mustChangePasswordOf,
  planRefusalMessage,
  withPasswordFlag,
} from './authErrors.js';

const err = (status, data) => ({ response: { status, data } });

test('planRefusalMessage recognises the plan codes on a 403', () => {
  assert.equal(
    planRefusalMessage(err(403, { code: 'PLAN_DASHBOARD_DISABLED', message: 'No dashboard.' })),
    'No dashboard.',
  );
  assert.equal(
    planRefusalMessage(err(403, { code: 'PLAN_PLATFORM_DISABLED' })),
    PLAN_REFUSAL_FALLBACK,
  );
  // Same code on another status is not a plan refusal.
  assert.equal(planRefusalMessage(err(401, { code: 'PLAN_DASHBOARD_DISABLED' })), null);
});

test('planRefusalMessage falls back to the message text only without a code', () => {
  const msg = 'Your school’s plan does not include this dashboard. Contact the administrator.';
  assert.equal(planRefusalMessage(err(403, { message: msg })), msg);
  const platform = "Your school's plan does not include the web portal. Contact the administrator.";
  assert.equal(planRefusalMessage(err(403, { message: platform })), platform);
  // A feature-level 403 must not end the session.
  assert.equal(
    planRefusalMessage(err(403, { message: 'Your plan does not include the library module' })),
    null,
  );
  assert.equal(planRefusalMessage(err(403, { code: 'FORBIDDEN', message: msg })), null);
  assert.equal(planRefusalMessage(err(403, 'not json')), null);
  assert.equal(planRefusalMessage(new Error('offline')), null);
});

test('isPasswordChangeRequired matches the code on a 403 only', () => {
  assert.equal(isPasswordChangeRequired(err(403, { code: 'PASSWORD_CHANGE_REQUIRED' })), true);
  assert.equal(isPasswordChangeRequired(err(400, { code: 'PASSWORD_CHANGE_REQUIRED' })), false);
  assert.equal(isPasswordChangeRequired(err(403, { message: 'x' })), false);
  assert.equal(isPasswordChangeRequired(undefined), false);
});

test('mustChangePasswordOf / withPasswordFlag read the flag from either place', () => {
  assert.equal(mustChangePasswordOf({ user: {}, mustChangePassword: true }), true);
  assert.equal(mustChangePasswordOf({ user: { mustChangePassword: false } }), false);
  assert.equal(mustChangePasswordOf({ user: {} }), undefined);
  assert.equal(mustChangePasswordOf(null), undefined);
  const u = { id: '1' };
  assert.deepEqual(withPasswordFlag(u, { mustChangePassword: true }), {
    id: '1',
    mustChangePassword: true,
  });
  assert.equal(withPasswordFlag(u, {}), u);
  assert.equal(withPasswordFlag(null, { mustChangePassword: true }), null);
});
