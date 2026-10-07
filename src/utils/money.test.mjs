// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { componentAmount, componentTotal, round2 } from './money.js';

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
