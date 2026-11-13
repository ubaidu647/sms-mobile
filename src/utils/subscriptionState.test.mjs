// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  coversScreen,
  evaluateSubscription,
  fromStatusResponse,
  isBillingRoute,
  isBlockedState,
  paymentDueSoon,
} from './subscriptionState.js';

const billing = ['(app)', 'billing'];
const students = ['(app)', 'students'];

test('isBillingRoute matches the billing screen only', () => {
  assert.equal(isBillingRoute(billing), true);
  assert.equal(isBillingRoute(students), false);
  assert.equal(isBillingRoute(['(app)', 'billing', 'other']), false);
  assert.equal(isBillingRoute([]), false);
  assert.equal(isBillingRoute(undefined), false);
});

test('every blocked state covers other screens and leaves billing open', () => {
  for (const state of ['expired', 'cancelled', 'none']) {
    assert.equal(isBlockedState(state), true);
    assert.equal(coversScreen(state, students), true);
    assert.equal(coversScreen(state, billing), false);
  }
});

test('states that are not blocked cover nothing', () => {
  for (const state of ['active', 'grace', null]) {
    assert.equal(coversScreen(state, students), false);
  }
});

/* ------------------------------ unpaid invoice ------------------------------ */

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 5, 1);
const iso = (ms) => new Date(ms).toISOString();

test('unpaid is a blocked state that leaves billing open', () => {
  assert.equal(isBlockedState('unpaid'), true);
  assert.equal(coversScreen('unpaid', students), true);
  assert.equal(coversScreen('unpaid', billing), false);
});

test('the server reporting unpaid is kept, with its due date', () => {
  const g = fromStatusResponse(
    { state: 'unpaid', endDate: iso(now + 20 * DAY), hardBlockAt: iso(now + 20 * DAY), paymentDueAt: iso(now - DAY) },
    now,
  );
  assert.equal(g.state, 'unpaid');
  assert.equal(g.paymentDueAt.getTime(), now - DAY);
});

test('an active school crosses into unpaid once the due date passes', () => {
  const status = { state: 'active', endDate: iso(now + 20 * DAY), hardBlockAt: iso(now + 20 * DAY), paymentDueAt: iso(now + DAY) };
  assert.equal(fromStatusResponse(status, now).state, 'active');
  assert.equal(fromStatusResponse(status, now + 2 * DAY).state, 'unpaid');
});

test('expiry wins over an overdue invoice', () => {
  const status = { state: 'unpaid', endDate: iso(now - 2 * DAY), hardBlockAt: iso(now - DAY), paymentDueAt: iso(now - 5 * DAY) };
  assert.equal(fromStatusResponse(status, now).state, 'expired');
});

test('without a due date nothing turns unpaid', () => {
  const status = { state: 'active', endDate: iso(now + 20 * DAY), hardBlockAt: iso(now + 20 * DAY) };
  const g = fromStatusResponse(status, now);
  assert.equal(g.state, 'active');
  assert.equal(g.paymentDueAt, null);
});

test('evaluateSubscription mirrors the unpaid rule', () => {
  const sub = { status: 'active', endDate: iso(now + 20 * DAY), gracePeriodInDays: 0 };
  assert.equal(evaluateSubscription({ ...sub, paymentDueAt: iso(now - DAY) }, now).state, 'unpaid');
  assert.equal(evaluateSubscription({ ...sub, paymentDueAt: iso(now + DAY) }, now).state, 'active');
  assert.equal(evaluateSubscription(sub, now).state, 'active');
});

test('paymentDueSoon warns within 7 days of the due date only', () => {
  const at = (days, state = 'active') => ({ state, paymentDueAt: new Date(now + days * DAY) });
  assert.equal(paymentDueSoon(at(3), now), true);
  assert.equal(paymentDueSoon(at(7), now), true);
  assert.equal(paymentDueSoon(at(8), now), false);
  assert.equal(paymentDueSoon(at(-1), now), false);
  assert.equal(paymentDueSoon(at(3, 'grace'), now), true);
  assert.equal(paymentDueSoon(at(3, 'unpaid'), now), false);
  assert.equal(paymentDueSoon({ state: 'active', paymentDueAt: null }, now), false);
  assert.equal(paymentDueSoon(null, now), false);
});
