// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isOutcomeUnknown,
  isSpentKeyError,
  nextPaymentKey,
  paymentErrorMessage,
  paymentKeyFor,
  paymentSuccessMessage,
} from './idempotency.js';

const http = (status, message) => ({ response: { status, data: { message } } });
const networkError = new Error('Network Error');
const changedAmount = http(409, 'Idempotency-Key was already used for a different payment');

test('no status or a 5xx is an unknown outcome; a 4xx is an answer', () => {
  assert.equal(isOutcomeUnknown(networkError), true);
  assert.equal(isOutcomeUnknown(http(500)), true);
  assert.equal(isOutcomeUnknown(http(503)), true);
  assert.equal(isOutcomeUnknown(http(400)), false);
  assert.equal(isOutcomeUnknown(http(409)), false);
});

test('every open gets a fresh key when nothing is held', () => {
  assert.notEqual(paymentKeyFor('voucher:fresh'), paymentKeyFor('voucher:fresh'));
});

test('an unknown outcome keeps the key for the next open of that target only', () => {
  const key = paymentKeyFor('voucher:lost');
  for (const err of [networkError, http(502)]) {
    assert.equal(nextPaymentKey('voucher:lost', key, err), key);
    assert.equal(paymentKeyFor('voucher:lost'), key);
  }
  assert.notEqual(paymentKeyFor('voucher:other'), key);
});

test('a definite refusal keeps the key for the retry but holds nothing', () => {
  const key = paymentKeyFor('voucher:refused');
  assert.equal(nextPaymentKey('voucher:refused', key, http(400, 'Too much')), key);
  assert.notEqual(paymentKeyFor('voucher:refused'), key);
});

test('a definite refusal does not release a key held from an unknown outcome', () => {
  const key = paymentKeyFor('student:held');
  nextPaymentKey('student:held', key, networkError);
  nextPaymentKey('student:held', key, http(400, 'Too much'));
  assert.equal(paymentKeyFor('student:held'), key);
});

test('success releases a held key and hands out a new one', () => {
  const key = paymentKeyFor('payslip:paid');
  nextPaymentKey('payslip:paid', key, networkError);
  const next = nextPaymentKey('payslip:paid', key);
  assert.notEqual(next, key);
  assert.notEqual(paymentKeyFor('payslip:paid'), key);
});

test('a spent-key conflict releases a held key and hands out a new one', () => {
  for (const err of [changedAmount, http(409, 'This payment was voided')]) {
    const key = paymentKeyFor('payslip:spent');
    nextPaymentKey('payslip:spent', key, networkError);
    assert.notEqual(nextPaymentKey('payslip:spent', key, err), key);
    assert.notEqual(paymentKeyFor('payslip:spent'), key);
  }
});

test('only a key conflict counts as spent, not every 409', () => {
  assert.equal(isSpentKeyError(changedAmount), true);
  assert.equal(isSpentKeyError(http(409, 'This payment was reversed')), true);
  assert.equal(isSpentKeyError(http(409, 'The payslip changed while it was being paid')), false);
  assert.equal(isSpentKeyError(http(400, 'Idempotency-Key must be 8-128 characters')), false);
  assert.equal(isSpentKeyError(networkError), false);
});

test('the changed-amount conflict never shows the header name', () => {
  const message = paymentErrorMessage(changedAmount);
  assert.doesNotMatch(message, /Idempotency/i);
  assert.match(message, /different amount/);
});

test('other errors keep the server text, then the error, then the fallback', () => {
  assert.equal(paymentErrorMessage(http(400, 'Too much')), 'Too much');
  assert.equal(paymentErrorMessage(networkError), 'Network Error');
  assert.equal(paymentErrorMessage({}, 'Nope'), 'Nope');
});

test('a replayed payslip payment reads as already recorded', () => {
  assert.equal(
    paymentSuccessMessage('Payment already recorded for this Idempotency-Key', 'Paid'),
    'Payment already recorded',
  );
  assert.equal(paymentSuccessMessage('Payslip marked as paid', 'Paid'), 'Payslip marked as paid');
  assert.equal(paymentSuccessMessage(undefined, 'Paid'), 'Paid');
});
