// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  initialBlockEnabled,
  isPaymentOverdue,
  paymentDueFields,
  paymentWindow,
} from './paymentDue.js';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 5, 1);

test('switch off sends null', () => {
  assert.deepEqual(paymentDueFields({ enabled: false, raw: '20' }), { fields: { paymentDueInDays: null } });
});

test('a blank field omits the key', () => {
  assert.deepEqual(paymentDueFields({ enabled: true, raw: '' }), { fields: {} });
  assert.deepEqual(paymentDueFields({ enabled: true, raw: '  ' }), { fields: {} });
  assert.deepEqual(paymentDueFields({ enabled: true, raw: undefined }), { fields: {} });
});

test('a blank field is refused when it would silently carry "off"', () => {
  assert.deepEqual(paymentDueFields({ enabled: true, raw: '', carriedOff: true }), { error: 'required' });
});

test('a number in 1–365 is sent', () => {
  assert.deepEqual(paymentDueFields({ enabled: true, raw: '1' }), { fields: { paymentDueInDays: 1 } });
  assert.deepEqual(paymentDueFields({ enabled: true, raw: ' 365 ' }), { fields: { paymentDueInDays: 365 } });
});

test('anything else is out of range', () => {
  for (const raw of ['0', '366', '-3', '2.5', 'abc', '1e2']) {
    assert.deepEqual(paymentDueFields({ enabled: true, raw }), { error: 'range' }, raw);
  }
});

test('the switch starts off only when the plan had blocking off', () => {
  assert.equal(initialBlockEnabled({ paymentDueInDays: null }), false);
  assert.equal(initialBlockEnabled({ paymentDueInDays: 10 }), true);
  assert.equal(initialBlockEnabled({}), true);
  assert.equal(initialBlockEnabled(null), true);
});

test('paymentWindow describes the stored value', () => {
  assert.deepEqual(paymentWindow({ paymentDueInDays: null }), { kind: 'off' });
  assert.deepEqual(paymentWindow({ paymentDueInDays: 15 }), { kind: 'days', days: 15 });
  assert.deepEqual(paymentWindow({}), { kind: 'default' });
});

test('overdue only for an active plan past its due date', () => {
  const sub = { status: 'active', paymentDueAt: new Date(now - DAY).toISOString() };
  assert.equal(isPaymentOverdue(sub, now), true);
  assert.equal(isPaymentOverdue({ ...sub, paymentDueAt: new Date(now + DAY).toISOString() }, now), false);
  assert.equal(isPaymentOverdue({ ...sub, status: 'expired' }, now), false);
  assert.equal(isPaymentOverdue({ ...sub, paymentDueAt: null }, now), false);
  assert.equal(isPaymentOverdue(null, now), false);
});
