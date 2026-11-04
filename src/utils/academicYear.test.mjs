// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  academicYearStartMonth,
  currentAcademicYear,
  defaultAcademicYearStartMonth,
  setSchoolAcademicYearStartMonth,
  setAcademicYearUser,
  academicYearUser,
  clearAcademicYearStartMonth,
  startMonthFromSettings,
} from './academicYear.js';

test('April by default: Jan–Mar belong to the previous start year', () => {
  assert.equal(currentAcademicYear(new Date(2027, 2, 31), 4), '2026-2027');
  assert.equal(currentAcademicYear(new Date(2027, 3, 1), 4), '2027-2028');
});

test('the default month comes from EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH, else April', () => {
  const prev = process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH;
  try {
    delete process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH;
    assert.equal(defaultAcademicYearStartMonth(), 4);
    process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH = '9';
    assert.equal(defaultAcademicYearStartMonth(), 9);
    process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH = '13';
    assert.equal(defaultAcademicYearStartMonth(), 4);
  } finally {
    if (prev === undefined) delete process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH;
    else process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH = prev;
  }
});

test("the school's own month wins, and clears back to the default", () => {
  try {
    setSchoolAcademicYearStartMonth(8);
    assert.equal(academicYearStartMonth(), 8);
    // 6 July 2026: before an August start, so still 2025-2026
    assert.equal(currentAcademicYear(new Date(2026, 6, 6)), '2025-2026');
    assert.equal(currentAcademicYear(new Date(2026, 7, 1)), '2026-2027');

    setSchoolAcademicYearStartMonth(0); // invalid → no setting
    assert.equal(academicYearStartMonth(), defaultAcademicYearStartMonth());
  } finally {
    setSchoolAcademicYearStartMonth(null);
  }
});

test('startMonthFromSettings prefers the effective month the API uses', () => {
  assert.equal(
    startMonthFromSettings({ academicYearStartMonth: null, effectiveAcademicYearStartMonth: 9 }),
    9,
  );
  assert.equal(startMonthFromSettings({ academicYearStartMonth: 7 }), 7);
  assert.equal(startMonthFromSettings({ academicYearStartMonth: null }), null);
  assert.equal(startMonthFromSettings(null), null);
  assert.equal(startMonthFromSettings({ effectiveAcademicYearStartMonth: 0 }), null);
});

test("a new user / sign-out never inherits the previous school's month", () => {
  const prev = process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH;
  try {
    process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH = '6';
    setAcademicYearUser('u1');
    setSchoolAcademicYearStartMonth(8);
    assert.equal(academicYearStartMonth(), 8);
    setAcademicYearUser('u1'); // same user again: kept
    assert.equal(academicYearStartMonth(), 8);

    setAcademicYearUser('u2'); // switched user: back to the env default
    assert.equal(academicYearStartMonth(), 6);

    setSchoolAcademicYearStartMonth(1);
    clearAcademicYearStartMonth(); // sign-out
    assert.equal(academicYearUser(), null);
    assert.equal(academicYearStartMonth(), 6);
  } finally {
    clearAcademicYearStartMonth();
    if (prev === undefined) delete process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH;
    else process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH = prev;
  }
});
