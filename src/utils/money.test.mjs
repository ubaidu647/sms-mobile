// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  componentAmount,
  componentTotal,
  DEFAULT_SCHOOL_CURRENCY,
  formatMoney,
  round2,
  SCHOOL_CURRENCIES,
  schoolCurrencyFrom,
} from './money.js';

const n = (x) => x.toLocaleString(undefined, { maximumFractionDigits: 2 });

test('round2 trims float noise to paisa', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(33333.333333), 33333.33);
  assert.equal(round2(1.005 * 1000), 1005);
  assert.equal(round2('12.345'), 12.35);
  assert.equal(round2(undefined), 0);
});

test('componentAmount handles percent and fixed', () => {
  assert.equal(componentAmount(33333, { type: 'percent', amount: 7.5 }), 2499.98);
  assert.equal(componentAmount(50000, { type: 'fixed', amount: '1500' }), 1500);
  assert.equal(componentAmount(50000, null), 0);
});

test('componentTotal matches the server: sum raw, skip negatives, round once', () => {
  const list = [
    { type: 'percent', amount: 10 },
    { type: 'percent', amount: 3.3333 },
    { type: 'fixed', amount: -500 },
    { type: 'fixed', amount: 250.5 },
  ];
  assert.equal(componentTotal(33333, list), 4694.89);
  assert.equal(componentTotal(1000, []), 0);
  assert.equal(componentTotal(1000, undefined), 0);
});

test('formatMoney puts the symbol before the rounded, grouped amount', () => {
  assert.equal(formatMoney(1500, 'Rs'), `Rs ${n(1500)}`);
  assert.equal(formatMoney(1234567.891, '$'), `$ ${n(1234567.89)}`);
  assert.equal(formatMoney(2499.975, 'AED'), `AED ${n(2499.98)}`);
  assert.equal(formatMoney('12.5', '€'), `€ ${n(12.5)}`);
  assert.equal(formatMoney(-500, '£'), `£ ${n(-500)}`);
});

test('formatMoney falls back to Rs and to 0', () => {
  assert.equal(formatMoney(100), `Rs ${n(100)}`);
  assert.equal(formatMoney(100, ''), `Rs ${n(100)}`);
  assert.equal(formatMoney(100, null), `Rs ${n(100)}`);
  assert.equal(formatMoney(undefined, '₹'), '₹ 0');
  assert.equal(formatMoney('abc', '₹'), '₹ 0');
});

test('schoolCurrencyFrom reads the settings payload', () => {
  assert.deepEqual(schoolCurrencyFrom({ currency: 'AED', currencySymbol: 'AED' }), {
    code: 'AED',
    symbol: 'AED',
  });
  assert.deepEqual(schoolCurrencyFrom({ currency: 'INR' }), { code: 'INR', symbol: '₹' });
  assert.deepEqual(schoolCurrencyFrom({ currency: 'usd', currencySymbol: ' ' }), {
    code: 'USD',
    symbol: '$',
  });
});

test('schoolCurrencyFrom falls back to PKR / Rs', () => {
  assert.deepEqual(DEFAULT_SCHOOL_CURRENCY, { code: 'PKR', symbol: 'Rs' });
  assert.deepEqual(schoolCurrencyFrom(undefined), DEFAULT_SCHOOL_CURRENCY);
  assert.deepEqual(schoolCurrencyFrom(null), DEFAULT_SCHOOL_CURRENCY);
  assert.deepEqual(schoolCurrencyFrom({}), DEFAULT_SCHOOL_CURRENCY);
  assert.deepEqual(schoolCurrencyFrom({ currency: 'XYZ', currencySymbol: 'X' }), DEFAULT_SCHOOL_CURRENCY);
});

test('SCHOOL_CURRENCIES matches the API list', () => {
  assert.deepEqual(
    SCHOOL_CURRENCIES.map((c) => c.code),
    ['PKR', 'INR', 'BDT', 'AFN', 'AED', 'SAR', 'QAR', 'OMR', 'KWD', 'BHD', 'USD', 'GBP', 'EUR'],
  );
  assert.equal(SCHOOL_CURRENCIES.find((c) => c.code === 'PKR').symbol, 'Rs');
});
