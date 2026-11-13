// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { missingPapersReason, resultCardPlacement, sectionResultLabel } from './examResult.js';

test('section label', () => {
  assert.equal(sectionResultLabel({ isPassed: true, missingCount: 0 }), 'PASS');
  assert.equal(sectionResultLabel({ isPassed: false, failedCount: 0, missingCount: 1 }), 'FAIL · 1 paper missing');
  assert.equal(sectionResultLabel({ isPassed: false, failedCount: 2, missingCount: 3 }), 'FAIL · 2 failed · 3 papers missing');
  assert.equal(sectionResultLabel({ isPassed: false, failedCount: 1 }), 'FAIL · 1 failed');
  assert.equal(sectionResultLabel({ isPassed: false }), 'FAIL');
});

test('result card reason', () => {
  assert.equal(missingPapersReason({ isPassed: false, missingSubjectsCount: 1 }), 'Failed: 1 required paper has no result');
  assert.equal(missingPapersReason({ isPassed: false, missingSubjectsCount: 2 }), 'Failed: 2 required papers have no result');
  assert.equal(missingPapersReason({ isPassed: false, missingSubjectsCount: 0 }), null);
  assert.equal(missingPapersReason({ isPassed: true, missingSubjectsCount: 1 }), null);
  assert.equal(missingPapersReason(null), null);
});

test('result card placement prefers the exam class and recorded section', () => {
  const current = { class: { name: 'Class 6' }, section: { name: 'B' } };
  assert.deepEqual(
    resultCardPlacement({ ...current, examClass: { name: 'Class 5' }, examSection: { name: 'A' } }),
    { className: 'Class 5', sectionName: 'A' },
  );
  assert.deepEqual(resultCardPlacement(current), { className: 'Class 6', sectionName: 'B' });
  assert.deepEqual(
    resultCardPlacement({ ...current, examClass: null, examSection: null }),
    { className: 'Class 6', sectionName: 'B' },
  );
  assert.deepEqual(resultCardPlacement(undefined), { className: '', sectionName: '' });
});
