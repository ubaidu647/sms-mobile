// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { estimatePlanChange } from './planChangeEstimate.js';

const DAY = 24 * 60 * 60 * 1000;
const nowMs = Date.UTC(2026, 0, 1);
// 30-day plan at 3000 with 10 days left: 1000 of unused value.
const current = {
  packageSnapshot: { price: 3000, durationInDays: 30 },
  endDate: new Date(nowMs + 10 * DAY).toISOString(),
};
const estimate = (over = {}) =>
  estimatePlanChange({ current, invoice: { status: 'paid' }, newPrice: 5000, nowMs, ...over });

test('a paid plan credits its unused time', () => {
  const e = estimate();
  assert.equal(e.credit, 1000);
  assert.equal(e.amountDue, 4000);
  assert.equal(e.direction, 'Upgrade');
  assert.equal(e.invoiceUnpaid, false);
});

test('a plan with no invoice on record counts as paid', () => {
  assert.equal(estimate({ invoice: null }).credit, 1000);
});

test('an unpaid invoice gives no credit for unused time', () => {
  const e = estimate({ invoice: { status: 'unpaid', creditApplied: 0 } });
  assert.equal(e.credit, 0);
  assert.equal(e.amountDue, 5000);
  assert.equal(e.invoiceUnpaid, true);
});

test('an unpaid invoice hands back only the unused share of the credit it consumed', () => {
  const e = estimate({ invoice: { status: 'unpaid', creditApplied: 600 } });
  assert.equal(e.credit, 200);
  assert.equal(e.amountDue, 4800);
});

test('a void invoice gives no credit, even with credit recorded on it', () => {
  assert.equal(estimate({ invoice: { status: 'void', creditApplied: 600 } }).credit, 0);
});

test('carried credit counts whether or not the invoice was paid', () => {
  const withCarry = { ...current, carriedCredit: 250 };
  assert.equal(estimate({ current: withCarry }).credit, 1250);
  assert.equal(estimate({ current: withCarry, invoice: { status: 'unpaid' } }).credit, 250);
  assert.equal(estimate({ current: withCarry, invoice: { status: 'void' } }).amountDue, 4750);
});

test('credit beyond the new price carries forward and nothing is due', () => {
  const e = estimate({ newPrice: 400 });
  assert.equal(e.amountDue, 0);
  assert.equal(e.carriedForward, 600);
  assert.equal(e.direction, 'Downgrade');
});

test('an ended plan has no unused time left', () => {
  const ended = { ...current, endDate: new Date(nowMs - DAY).toISOString() };
  assert.equal(estimate({ current: ended }).credit, 0);
});

test('a free plan with carried credit still gets an estimate', () => {
  const free = {
    ...current,
    packageSnapshot: { price: 0, durationInDays: 30 },
    carriedCredit: 250,
  };
  const e = estimate({ current: free });
  assert.equal(e.credit, 250);
  assert.equal(e.amountDue, 4750);
  assert.equal(e.direction, 'Upgrade');
});

test('with no cycle length the unused share goes by the dates', () => {
  const noCycle = {
    ...current,
    packageSnapshot: { price: 3000, durationInDays: 0 },
    startDate: new Date(nowMs - 20 * DAY).toISOString(),
  };
  assert.equal(estimate({ current: noCycle }).credit, 1000);
});

test('with neither a cycle length nor a start date, only carried credit counts', () => {
  const unknown = { ...current, packageSnapshot: { price: 3000 }, carriedCredit: 250 };
  assert.equal(estimate({ current: unknown }).credit, 250);
});

test('nothing to estimate without a billing basis or a chosen price', () => {
  assert.equal(estimate({ newPrice: undefined }), null);
  assert.equal(estimate({ current: { ...current, packageSnapshot: null } }), null);
  assert.equal(estimate({ current: { ...current, packageSnapshot: {} } }), null);
  assert.equal(estimate({ current: { ...current, endDate: null } }), null);
});

/* ---------------------------- renew from end date ---------------------------- */

const renew = (over = {}) =>
  estimate({ newPrice: 3000, newDurationInDays: 30, ...over });

test('renewing from today credits the unused days and starts the period now', () => {
  const e = renew();
  assert.equal(e.credit, 1000);
  assert.equal(e.amountDue, 2000);
  assert.equal(e.extendsPlan, false);
  assert.equal(e.endDate.getTime(), nowMs + 30 * DAY);
});

test('renewing from the end date credits nothing and starts at the old end date', () => {
  const e = renew({ startFrom: 'endDate' });
  assert.equal(e.credit, 0);
  assert.equal(e.amountDue, 3000);
  assert.equal(e.extendsPlan, true);
  assert.equal(e.refused, false);
  assert.equal(e.endDate.getTime(), nowMs + 40 * DAY);
});

test('renewing from the end date still counts carried credit', () => {
  const e = renew({ startFrom: 'endDate', current: { ...current, carriedCredit: 250 } });
  assert.equal(e.credit, 250);
  assert.equal(e.amountDue, 2750);
});

test('renewing from the end date is refused while the invoice is unpaid', () => {
  const e = renew({ startFrom: 'endDate', invoice: { status: 'unpaid', creditApplied: 0 } });
  assert.equal(e.refused, true);
  assert.equal(e.credit, 0);
});

test('a plan past its end date renews from today with either option', () => {
  const ended = { ...current, endDate: new Date(nowMs - DAY).toISOString() };
  const a = renew({ current: ended });
  const b = renew({ current: ended, startFrom: 'endDate', invoice: { status: 'unpaid' } });
  assert.equal(b.extendsPlan, false);
  assert.equal(b.refused, false);
  assert.equal(a.endDate.getTime(), nowMs + 30 * DAY);
  assert.equal(b.endDate.getTime(), a.endDate.getTime());
});

test('no end date without a duration', () => {
  assert.equal(estimate().endDate, null);
});

/* -------------------------------- Add-ons ------------------------------- */
// 100 extra students at 10 per 30-day period = 1000 a period; 10 of 30 days
// left → 333.33 of unused value when paid.
const paidAddon = { quantity: 100, unitPrice: 10, paid: true, removable: false };
const unpaidAddon = { quantity: 100, unitPrice: 10, paid: false, removable: true };

test('a kept add-on is billed for the full new period and its unused paid value credited', () => {
  const e = renew({ addons: [paidAddon], keepAddons: true });
  assert.equal(e.addonCharge, 1000);
  assert.equal(e.addonCredit, 333.33);
  assert.equal(e.credit, 1333.33);
  assert.equal(e.amountDue, 2666.67); // 3000 + 1000 − 1333.33
});

test('a dropped add-on only credits its unused paid value', () => {
  const e = renew({ addons: [paidAddon], keepAddons: false });
  assert.equal(e.addonCharge, 0);
  assert.equal(e.addonCredit, 333.33);
  assert.equal(e.amountDue, 1666.67);
});

test('kept add-ons renewed from the end date keep their days: no credit, full charge', () => {
  const e = renew({ startFrom: 'endDate', addons: [paidAddon], keepAddons: true });
  assert.equal(e.addonCredit, 0);
  assert.equal(e.addonCharge, 1000);
  assert.equal(e.amountDue, 4000);
  assert.equal(e.refused, false);
});

test('dropped add-ons renewed from the end date are credited', () => {
  const e = renew({ startFrom: 'endDate', addons: [paidAddon], keepAddons: false });
  assert.equal(e.addonCredit, 333.33);
  assert.equal(e.amountDue, 2666.67);
});

test('an unpaid add-on earns no credit and refuses renewing from the end date', () => {
  const today = renew({ addons: [unpaidAddon], keepAddons: true });
  assert.equal(today.addonCredit, 0);
  assert.equal(today.amountDue, 3000); // 3000 + 1000 − 1000 plan credit
  assert.equal(today.refused, false);
  const fromEnd = renew({ startFrom: 'endDate', addons: [unpaidAddon], keepAddons: true });
  assert.equal(fromEnd.refused, true);
  assert.equal(fromEnd.addonsUnpaid, true);
  assert.equal(fromEnd.invoiceUnpaid, false);
});

test('a longer new period rescales the kept add-on unit price', () => {
  const e = renew({ newDurationInDays: 60, newPrice: 6000, addons: [paidAddon], keepAddons: true });
  assert.equal(e.addonCharge, 2000);
});

test('a package change (keepAddons off by default) credits paid add-ons', () => {
  const e = estimate({ addons: [paidAddon, unpaidAddon] });
  assert.equal(e.addonCharge, 0);
  assert.equal(e.credit, 1333.33);
  assert.equal(e.amountDue, 3666.67);
});

test('a module add-on counts as 1 × unit price in credit and carry', () => {
  const addons = [{ resource: 'module', module: 'whatsapp', unitPrice: 900, paid: true }];
  // Package change: dropped, a third of 900 credited.
  const change = estimate({ addons });
  assert.equal(change.addonCredit, 300);
  assert.equal(change.credit, 1300);
  // Renewal keeping it: billed again for a whole period.
  const renew = estimate({ addons, keepAddons: true, newPrice: 3000, newDurationInDays: 30 });
  assert.equal(renew.addonCharge, 900);
  assert.equal(renew.amountDue, 3000 + 900 - 1300);
});

test('a renewal does not carry a module the plan now includes', () => {
  const addons = [
    { resource: 'module', module: 'whatsapp', unitPrice: 900, paid: true },
    { resource: 'noOfStudents', quantity: 10, unitPrice: 10, paid: true },
  ];
  const base = { addons, keepAddons: true, newPrice: 3000, newDurationInDays: 30 };
  assert.equal(estimate({ ...base, newFeatures: ['core', 'leave'] }).addonCharge, 1000);
  assert.equal(estimate({ ...base, newFeatures: ['core', 'whatsapp'] }).addonCharge, 100);
  // Its paid unused value is still credited.
  assert.equal(estimate({ ...base, newFeatures: ['core', 'whatsapp'] }).addonCredit, 333.33);
});
