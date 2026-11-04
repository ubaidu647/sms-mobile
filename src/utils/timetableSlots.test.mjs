// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildTimetableSlots, describeIncomplete, incompleteKeys } from './timetableSlots.js';

const config = {
  workingDays: ['mon', 'tue'],
  periods: [
    { number: 1, type: 'lesson', name: 'P1' },
    { number: 2, type: 'break', name: 'Lunch' },
    { number: 3, type: 'lesson', name: 'P3' },
  ],
};

test('complete lessons and non-lesson periods become slots', () => {
  const grid = { mon: { 1: { subjectId: 's1', staffId: 't1', room: 'R1' } } };
  const { slots, incomplete } = buildTimetableSlots(grid, config);
  assert.deepEqual(incomplete, []);
  assert.deepEqual(slots.find((s) => s.day === 'mon' && s.periodNumber === 1), {
    day: 'mon', periodNumber: 1, slotType: 'lesson', subjectId: 's1', staffId: 't1', room: 'R1',
  });
  assert.equal(slots.filter((s) => s.slotType === 'break').length, 2);
  assert.equal(slots.length, 3);
});

test('fully empty lesson cells are no lesson, not incomplete', () => {
  const grid = { mon: { 1: { subjectId: '', staffId: '', room: 'R1' } } };
  const { slots, incomplete } = buildTimetableSlots(grid, config);
  assert.deepEqual(incomplete, []);
  assert.equal(slots.filter((s) => s.slotType === 'lesson').length, 0);
});

test('half-filled cells are reported and not emitted', () => {
  const grid = {
    mon: { 1: { subjectId: 's1', staffId: '' } },
    tue: { 3: { subjectId: '', staffId: 't2' } },
  };
  const { slots, incomplete } = buildTimetableSlots(grid, config);
  assert.deepEqual(incomplete, [
    { day: 'mon', periodNumber: 1, periodName: 'P1', missing: 'teacher' },
    { day: 'tue', periodNumber: 3, periodName: 'P3', missing: 'subject' },
  ]);
  assert.equal(slots.filter((s) => s.slotType === 'lesson').length, 0);
  assert.deepEqual([...incompleteKeys(incomplete)], ['mon:1', 'tue:3']);
});

test('describeIncomplete names day and period', () => {
  const inc = [
    { day: 'mon', periodNumber: 1, missing: 'teacher' },
    { day: 'tue', periodNumber: 3, missing: 'subject' },
    { day: 'tue', periodNumber: 4, missing: 'subject' },
    { day: 'wed', periodNumber: 1, missing: 'teacher' },
  ];
  assert.equal(
    describeIncomplete(inc.slice(0, 2), { mon: 'Monday', tue: 'Tuesday' }),
    'Monday P1 needs a teacher; Tuesday P3 needs a subject',
  );
  assert.match(describeIncomplete(inc, {}), /; \+1 more$/);
  assert.equal(describeIncomplete([], {}), '');
});

test('missing config yields nothing', () => {
  assert.deepEqual(buildTimetableSlots({}, null), { slots: [], incomplete: [] });
});
