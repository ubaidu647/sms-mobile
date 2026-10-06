// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { changedFields } from './changedFields.js';

const ended = {
  routeId: 'r1',
  stopName: 'Green Park',
  direction: 'both',
  monthlyFee: 1500,
  notes: '',
  status: 'cancelled',
  endDate: '2025-10-31',
};

test('an untouched ended assignment sends nothing about its status or end date', () => {
  assert.deepEqual(changedFields(ended, { ...ended, stopName: 'Lake View' }), {
    stopName: 'Lake View',
  });
});

test('a fee typed back as a string is not a change', () => {
  assert.deepEqual(changedFields(ended, { ...ended, monthlyFee: '1500' }), {});
});

test('clearing a field is a change', () => {
  assert.deepEqual(changedFields(ended, { ...ended, endDate: null }), { endDate: null });
});
