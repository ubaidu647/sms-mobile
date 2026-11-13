// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  launchOfferField,
  launchOfferOpen,
  launchOfferPayload,
  launchOfferSlotsLeft,
  launchOfferToForm,
  livePriceLock,
  renewalPrice,
  startPrice,
} from './launchOffer.js';

const DAY = 24 * 60 * 60 * 1000;
const nowMs = Date.UTC(2026, 0, 1);
const pkg = {
  _id: 'p1',
  price: 5000,
  launchOffer: { active: true, price: 3000, maxSchools: 10, lockDays: 365, claimed: 4 },
};

test('an active offer with slots left is open', () => {
  assert.equal(launchOfferSlotsLeft(pkg), 6);
  assert.equal(launchOfferOpen(pkg), true);
  assert.equal(launchOfferOpen({ ...pkg, launchOffer: { ...pkg.launchOffer, claimed: 10 } }), false);
  assert.equal(launchOfferOpen({ ...pkg, launchOffer: { ...pkg.launchOffer, active: false } }), false);
  assert.equal(launchOfferOpen({ price: 5000 }), false);
  assert.equal(launchOfferSlotsLeft({ launchOffer: { maxSchools: 3, claimed: 9 } }), 0);
  assert.equal(launchOfferSlotsLeft({ launchOffer: { maxSchools: 3 } }), 3);
});

test('startPrice uses the offer only when it is open and applied', () => {
  assert.equal(startPrice(pkg), 3000);
  assert.equal(startPrice(pkg, false), 5000);
  assert.equal(startPrice({ ...pkg, launchOffer: { ...pkg.launchOffer, claimed: 10 } }), 5000);
  assert.equal(startPrice(undefined), undefined);
});

test('a price lock counts only until it ends', () => {
  const sub = { packageId: 'p1', priceLock: { price: 3000, until: new Date(nowMs + DAY).toISOString() } };
  assert.equal(livePriceLock(sub, nowMs).price, 3000);
  assert.equal(livePriceLock(sub, nowMs + 2 * DAY), null);
  assert.equal(livePriceLock({ priceLock: null }, nowMs), null);
});

test('renewalPrice keeps the locked price while it lasts', () => {
  const sub = {
    packageId: { _id: 'p1' },
    packageSnapshot: { price: 3000 },
    priceLock: { price: 3000, until: new Date(nowMs + DAY).toISOString() },
  };
  assert.equal(renewalPrice(sub, pkg, nowMs), 3000);
  assert.equal(renewalPrice(sub, pkg, nowMs + 2 * DAY), 5000);
  assert.equal(renewalPrice({ ...sub, priceLock: null }, null, nowMs), 3000);
  assert.equal(renewalPrice(sub, { ...pkg, _id: 'other' }, nowMs), 5000);
});

test('launch offer form round trip and validation', () => {
  const form = launchOfferToForm(pkg.launchOffer);
  assert.deepEqual(form, { enabled: true, price: '3000', maxSchools: '10', lockDays: '365' });
  assert.deepEqual(launchOfferPayload(form), {
    launchOffer: { active: true, price: 3000, maxSchools: 10, lockDays: 365 },
  });
  assert.equal(launchOfferPayload({ ...form, enabled: false }).launchOffer.active, false);
  const empty = launchOfferToForm(undefined);
  assert.deepEqual(launchOfferPayload(empty), {});
  assert.deepEqual(launchOfferPayload(empty, true), { launchOffer: null });
  assert.deepEqual(launchOfferPayload({ ...form, price: '' }), { error: 'price' });
  assert.deepEqual(launchOfferPayload({ ...form, price: '-1' }), { error: 'price' });
  assert.deepEqual(launchOfferPayload({ ...form, maxSchools: '0' }), { error: 'maxSchools' });
  assert.deepEqual(launchOfferPayload({ ...form, maxSchools: '2.5' }), { error: 'maxSchools' });
  assert.deepEqual(launchOfferPayload({ ...form, lockDays: '4000' }), { error: 'lockDays' });
  assert.deepEqual(launchOfferPayload({ ...form, lockDays: '' }), { error: 'lockDays' });
});

test('launchOfferField sends false only when an open offer is switched off', () => {
  assert.deepEqual(launchOfferField(pkg, true), {});
  assert.deepEqual(launchOfferField(pkg, false), { launchOffer: false });
  assert.deepEqual(launchOfferField({ price: 5000 }, false), {});
});
