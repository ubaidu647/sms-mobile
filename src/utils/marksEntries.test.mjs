// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildMarkEntries, savedStudentIds } from './marksEntries.js';

const students = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];

test('a blank row is left out, not saved as 0', () => {
  const entries = buildMarkEntries(
    students,
    { a: { theoryObtained: '45' }, b: { theoryObtained: '' }, c: {} },
    { hasTheory: true, hasPractical: false },
  );
  assert.deepEqual(entries, [{ studentId: 'a', theoryObtained: 45 }]);
});

test('a blank half of a split paper is sent as null', () => {
  const entries = buildMarkEntries(
    students.slice(0, 1),
    { a: { theoryObtained: '30', practicalObtained: '' } },
    { hasTheory: true, hasPractical: true },
  );
  assert.deepEqual(entries, [{ studentId: 'a', theoryObtained: 30, practicalObtained: null }]);
});

test('a typed 0 is still a 0, and absent needs no mark', () => {
  const entries = buildMarkEntries(
    students.slice(0, 2),
    { a: { theoryObtained: 0 }, b: { isAbsent: true } },
    { hasTheory: false, hasPractical: false },
  );
  assert.deepEqual(entries, [
    { studentId: 'a', theoryObtained: 0 },
    { studentId: 'b', isAbsent: true },
  ]);
});

test('wiping a saved mark clears it; a never-saved blank row is still left out', () => {
  const entries = buildMarkEntries(
    students,
    { a: { theoryObtained: '' }, b: { theoryObtained: '' }, c: { theoryObtained: '12' } },
    { hasTheory: true, hasPractical: false, saved: new Set(['a', 'c']) },
  );
  assert.deepEqual(entries, [
    { studentId: 'a', clear: true },
    { studentId: 'c', theoryObtained: 12 },
  ]);
});

test('savedStudentIds reads populated and plain student ids', () => {
  assert.deepEqual(
    [...savedStudentIds([{ studentId: { _id: 'a' } }, { studentId: 'b' }])],
    ['a', 'b'],
  );
});
