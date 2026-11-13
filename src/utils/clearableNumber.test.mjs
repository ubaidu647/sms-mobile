// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { clearableNumber } from './clearableNumber.js';

test('blank clears, it does not save a 0', () => {
  for (const blank of ['', '   ', null, undefined]) assert.equal(clearableNumber(blank), null);
});

test('a typed value is sent as a number, and 0 stays 0', () => {
  assert.equal(clearableNumber('60'), 60);
  assert.equal(clearableNumber('0'), 0);
  assert.equal(clearableNumber(0), 0);
});
