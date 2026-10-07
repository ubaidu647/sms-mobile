// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { localYMD, paymentDateError } from './paymentDate.js';

test('localYMD uses the local calendar day, zero-padded', () => {
  assert.equal(localYMD(new Date(2026, 0, 5, 0, 30)), '2026-01-05');
  assert.equal(localYMD(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('localYMD is not shifted by the UTC offset just after midnight', () => {
  const early = new Date(2026, 9, 6, 0, 15); // 00:15 local
  assert.equal(localYMD(early), '2026-10-06');
});

test('today and past dates are accepted', () => {
  assert.equal(paymentDateError('2026-10-06', '2026-10-06'), '');
  assert.equal(paymentDateError('2025-02-28', '2026-10-06'), '');
  assert.equal(paymentDateError('2024-02-29', '2026-10-06'), '');
});

test('future dates are rejected', () => {
  assert.equal(paymentDateError('2026-10-07', '2026-10-06'), 'Payment date cannot be in the future');
});

test('malformed or impossible dates are rejected', () => {
  for (const v of ['', null, undefined, '2026-1-5', '06-10-2026', '2026/10/06', 'today']) {
    assert.equal(paymentDateError(v, '2026-10-06'), 'Payment date must be YYYY-MM-DD');
  }
  for (const v of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10']) {
    assert.equal(paymentDateError(v, '2026-10-06'), 'Payment date is not a real date');
  }
});
