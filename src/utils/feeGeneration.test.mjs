// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  apiErrorMessage,
  normalizeSectionResult,
  sectionResultSummary,
  studentGenerateOutcome,
} from './feeGeneration.js';

test('generate-section: counts are numbers and skipped is a list with reasons', () => {
  const r = normalizeSectionResult({
    total: 3,
    createdCount: 1,
    skippedCount: 2,
    skipped: [
      { studentId: 'a', studentName: 'Adam (A-1)', reason: 'already billed' },
      { studentId: 'b', reason: 'No active fee structure for class Grade 5 2025-2026' },
    ],
  });
  assert.equal(r.created, 1);
  assert.equal(r.regenerated, null);
  assert.equal(r.skippedCount, 2);
  assert.deepEqual(r.skipped, [
    { studentId: 'a', name: 'Adam (A-1)', reason: 'already billed' },
    { studentId: 'b', name: null, reason: 'No active fee structure for class Grade 5 2025-2026' },
  ]);
  assert.equal(sectionResultSummary(r), '1 created · 2 skipped');
});

test('regenerate-section: both skipped lists are merged, counts mapped', () => {
  const r = normalizeSectionResult(
    {
      total: 4,
      regeneratedCount: 2,
      generatedCount: 1,
      skippedPaymentCount: 1,
      skippedOtherCount: 1,
      skippedDueToPayments: [{ studentId: 'p', studentName: 'Pia', voucherId: 'v', paidAmount: 500 }],
      skippedOther: [{ studentId: 'o', reason: 'nothing applicable' }],
    },
    'regenerate',
  );
  assert.equal(r.created, 1);
  assert.equal(r.regenerated, 2);
  assert.equal(r.skippedCount, 2);
  assert.equal(r.skipped[0].name, 'Pia');
  assert.match(r.skipped[0].reason, /payments \(500 paid\)/);
  assert.equal(r.skipped[1].reason, 'nothing applicable');
  assert.equal(sectionResultSummary(r), '2 regenerated · 1 created · 2 skipped');
});

test('missing or malformed data never yields objects where numbers are rendered', () => {
  for (const mode of ['generate', 'regenerate']) {
    const r = normalizeSectionResult(undefined, mode);
    assert.equal(r.created, 0);
    assert.equal(r.skippedCount, 0);
    assert.deepEqual(r.skipped, []);
  }
  const odd = normalizeSectionResult({ createdCount: '3', skipped: 'x' });
  assert.equal(odd.created, 0);
  assert.deepEqual(odd.skipped, []);
});

test('single student: the 200 skipped response carries its reason', () => {
  assert.deepEqual(
    studentGenerateOutcome({
      message: 'Voucher not generated: Voucher already exists for this month',
      data: { skipped: true, existing: 'x' },
    }),
    { skipped: true, reason: 'Voucher already exists for this month' },
  );
  assert.deepEqual(studentGenerateOutcome({ message: 'Voucher generated', data: { _id: 'v' } }), {
    skipped: false,
    reason: null,
  });
});

test('apiErrorMessage keeps the full server message', () => {
  const long = 'July 2026 belongs to 2025-2026, before this student\'s first year 2026-2027 — bill from August 2026.';
  assert.equal(apiErrorMessage({ response: { data: { message: long } } }), long);
  assert.equal(apiErrorMessage({ message: 'Network Error' }), 'Network Error');
  assert.equal(apiErrorMessage(null, 'Generate failed'), 'Generate failed');
});
