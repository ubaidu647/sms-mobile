// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assignmentEditChanges, changedFields } from './changedFields.js';

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

test('a stop change keeps the fee on screen, even when the fee was not touched', () => {
  assert.deepEqual(assignmentEditChanges(ended, { ...ended, stopName: 'Lake View' }), {
    stopName: 'Lake View',
    monthlyFee: 1500,
  });
});

test('a route change keeps the fee on screen', () => {
  assert.deepEqual(
    assignmentEditChanges(ended, { ...ended, routeId: 'r2', stopName: 'Hill Top' }),
    { routeId: 'r2', stopName: 'Hill Top', monthlyFee: 1500 },
  );
});

test('without a stop or route change an untouched fee is still left out', () => {
  assert.deepEqual(assignmentEditChanges(ended, { ...ended, notes: 'late pickup' }), {
    notes: 'late pickup',
  });
});

test('a stop change with no fee on screen lets the server price it', () => {
  const current = { ...ended, stopName: 'Lake View' };
  delete current.monthlyFee;
  assert.deepEqual(assignmentEditChanges(ended, current), {
    stopName: 'Lake View',
  });
});
