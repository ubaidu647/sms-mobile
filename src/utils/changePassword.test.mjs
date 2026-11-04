// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  changePasswordErrorMessage,
  tokensFromChangeResponse,
  validateChangePassword,
} from './changePassword.js';

const valid = { currentPassword: 'old-pass-1', newPassword: 'new-pass-12', confirmPassword: 'new-pass-12' };

test('a complete, matching form has no errors', () => {
  assert.deepEqual(validateChangePassword(valid), {});
});

test('every field is required', () => {
  const errors = validateChangePassword({});
  assert.ok(errors.currentPassword);
  assert.ok(errors.newPassword);
  assert.ok(errors.confirmPassword);
});

test('new password length matches the backend (8..128)', () => {
  const short = 'a'.repeat(PASSWORD_MIN - 1);
  assert.match(
    validateChangePassword({ ...valid, newPassword: short, confirmPassword: short }).newPassword,
    /at least 8/,
  );
  const exact = 'a'.repeat(PASSWORD_MIN);
  assert.deepEqual(validateChangePassword({ ...valid, newPassword: exact, confirmPassword: exact }), {});
  const long = 'a'.repeat(PASSWORD_MAX + 1);
  assert.match(
    validateChangePassword({ ...valid, newPassword: long, confirmPassword: long }).newPassword,
    /at most 128/,
  );
});

test('new password must differ from the current one', () => {
  const errors = validateChangePassword({
    currentPassword: 'same-pass-1',
    newPassword: 'same-pass-1',
    confirmPassword: 'same-pass-1',
  });
  assert.match(errors.newPassword, /different/);
});

test('confirmation must match', () => {
  assert.match(
    validateChangePassword({ ...valid, confirmPassword: 'other-pass-1' }).confirmPassword,
    /do not match/,
  );
});

test('non-string input is treated as empty', () => {
  const errors = validateChangePassword({ currentPassword: { $ne: '' }, newPassword: 12345678 });
  assert.ok(errors.currentPassword);
  assert.ok(errors.newPassword);
});

test('tokens are read from the response envelope', () => {
  assert.deepEqual(tokensFromChangeResponse({ data: { accessToken: 'a', refreshToken: 'r' } }), {
    accessToken: 'a',
    refreshToken: 'r',
  });
  assert.deepEqual(tokensFromChangeResponse({ data: { token: 'a', refreshToken: 'r' } }), {
    accessToken: 'a',
    refreshToken: 'r',
  });
});

test('a response without both tokens yields null (caller signs out)', () => {
  assert.equal(tokensFromChangeResponse({ data: { accessToken: 'a' } }), null);
  assert.equal(tokensFromChangeResponse({ data: null }), null);
  assert.equal(tokensFromChangeResponse(undefined), null);
});

test('error message prefers the server text', () => {
  assert.equal(
    changePasswordErrorMessage({ response: { status: 400, data: { message: 'Current password is incorrect' } } }),
    'Current password is incorrect',
  );
  assert.match(changePasswordErrorMessage(new Error('Network Error')), /offline/);
  assert.match(changePasswordErrorMessage({ response: { status: 500, data: {} } }), /Could not/);
});
