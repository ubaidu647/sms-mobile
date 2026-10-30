// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  applicantMeta,
  buildLeavePayload,
  calendarSpan,
  canCancelLeave,
  canCancelOwnLeave,
  canDecideLeave,
  countByStatus,
  extractWarnings,
  formatLeaveRange,
  isOnLeave,
  isValidYMD,
  sortBalanceRows,
  keptAsLeaveCount,
  keptAsLeaveMessage,
  sortPendingFirst,
  validateLeaveForm,
  ymdOf,
} from './leave.js';

const ok = {
  leaveType: 'casual',
  fromDate: '2026-10-12',
  toDate: '2026-10-14',
  reason: 'Family wedding',
};

test('isValidYMD accepts real days only', () => {
  assert.equal(isValidYMD('2026-10-09'), true);
  assert.equal(isValidYMD('2028-02-29'), true);
  assert.equal(isValidYMD('2026-02-29'), false);
  assert.equal(isValidYMD('2026-13-01'), false);
  assert.equal(isValidYMD('2026-1-01'), false);
  assert.equal(isValidYMD(''), false);
  assert.equal(isValidYMD(undefined), false);
});

test('ymdOf takes the calendar day of a UTC-midnight ISO string', () => {
  assert.equal(ymdOf('2026-10-09T00:00:00.000Z'), '2026-10-09');
  assert.equal(ymdOf('2026-10-09'), '2026-10-09');
  assert.equal(ymdOf(null), '');
  assert.equal(ymdOf('nope'), '');
});

test('calendarSpan is inclusive and 0 for bad ranges', () => {
  assert.equal(calendarSpan('2026-10-09', '2026-10-09'), 1);
  assert.equal(calendarSpan('2026-10-30', '2026-11-02'), 4);
  assert.equal(calendarSpan('2026-10-10', '2026-10-09'), 0);
  assert.equal(calendarSpan('x', '2026-10-09'), 0);
  // Spans a DST change in many zones; UTC arithmetic keeps it exact.
  assert.equal(calendarSpan('2026-03-01', '2026-03-31'), 31);
});

test('validateLeaveForm passes a valid own request', () => {
  assert.deepEqual(validateLeaveForm(ok), {});
});

test('validateLeaveForm flags dates, order, span and reason', () => {
  assert.ok(validateLeaveForm({ ...ok, fromDate: '2026-02-30' }).fromDate);
  assert.ok(validateLeaveForm({ ...ok, toDate: '2026-10-11' }).toDate);
  assert.ok(validateLeaveForm({ ...ok, toDate: '2026-12-31' }).toDate);
  assert.deepEqual(validateLeaveForm({ ...ok, toDate: '2026-12-10' }), {}); // 60 days
  assert.ok(validateLeaveForm({ ...ok, toDate: '2026-12-11' }).toDate); // 61 days
  assert.ok(validateLeaveForm({ ...ok, reason: '  ab ' }).reason);
  assert.ok(validateLeaveForm({ ...ok, reason: 'x'.repeat(501) }).reason);
  assert.ok(validateLeaveForm({ ...ok, leaveType: '' }).leaveType);
});

test('validateLeaveForm checks leave type per applicant and the applicant', () => {
  const student = { ...ok, applicantType: 'student', studentId: 's1' };
  assert.deepEqual(validateLeaveForm(student, { requireApplicant: true }), {});
  assert.ok(validateLeaveForm({ ...student, leaveType: 'annual' }).leaveType);
  assert.ok(
    validateLeaveForm({ ...student, studentId: '' }, { requireApplicant: true }).applicant,
  );
  assert.ok(
    validateLeaveForm({ ...ok, applicantType: 'staff' }, { requireApplicant: true }).applicant,
  );
  assert.deepEqual(
    validateLeaveForm({ ...ok, applicantType: 'staff', staffId: 't1', leaveType: 'unpaid' }, {
      requireApplicant: true,
    }),
    {},
  );
});

test('buildLeavePayload trims and adds the applicant only when asked', () => {
  assert.deepEqual(buildLeavePayload({ ...ok, reason: '  Sick  ', staffId: 'x' }), {
    leaveType: 'casual',
    fromDate: '2026-10-12',
    toDate: '2026-10-14',
    reason: 'Sick',
  });
  const body = buildLeavePayload(
    { ...ok, applicantType: 'student', studentId: 's1', staffId: 'x', approve: true },
    { withApplicant: true },
  );
  assert.equal(body.applicantType, 'student');
  assert.equal(body.studentId, 's1');
  assert.equal(body.staffId, undefined);
  assert.equal(body.approve, true);
  const staffBody = buildLeavePayload(
    { ...ok, applicantType: 'staff', staffId: 't1', approve: false },
    { withApplicant: true },
  );
  assert.equal(staffBody.staffId, 't1');
  assert.equal('approve' in staffBody, false);
});

test('sortPendingFirst keeps server order within groups', () => {
  const rows = [
    { _id: 1, status: 'approved' },
    { _id: 2, status: 'pending' },
    { _id: 3, status: 'rejected' },
    { _id: 4, status: 'pending' },
  ];
  assert.deepEqual(sortPendingFirst(rows).map((r) => r._id), [2, 4, 1, 3]);
  assert.deepEqual(sortPendingFirst(undefined), []);
});

test('countByStatus counts known statuses', () => {
  assert.deepEqual(
    countByStatus([{ status: 'pending' }, { status: 'pending' }, { status: 'bogus' }]),
    { pending: 2, approved: 0, rejected: 0, cancelled: 0 },
  );
});

test('sortBalanceRows puts unpaid last', () => {
  const rows = [{ leaveType: 'unpaid' }, { leaveType: 'sick' }, { leaveType: 'casual' }];
  assert.deepEqual(sortBalanceRows(rows).map((r) => r.leaveType), ['casual', 'sick', 'unpaid']);
});

test('status gates', () => {
  assert.equal(canCancelOwnLeave({ status: 'pending' }), true);
  assert.equal(canCancelOwnLeave({ status: 'approved' }), false);
  assert.equal(canDecideLeave({ status: 'approved' }), false);
  assert.equal(canCancelLeave({ status: 'approved' }), true);
  assert.equal(canCancelLeave({ status: 'rejected' }), false);
});

test('isOnLeave needs both the leave status and a request id', () => {
  assert.equal(isOnLeave({ status: 'leave', leaveRequestId: 'r1' }), true);
  assert.equal(isOnLeave({ status: 'leave' }), false);
  assert.equal(isOnLeave({ status: 'present', leaveRequestId: 'r1' }), false);
  assert.equal(isOnLeave(null), false);
});

test('extractWarnings reads the envelope or its data', () => {
  assert.deepEqual(extractWarnings({ warnings: ['a'] }), ['a']);
  assert.deepEqual(extractWarnings({ data: { warnings: ['b', '', 3] } }), ['b']);
  assert.deepEqual(extractWarnings({}), []);
});

test('formatLeaveRange and applicantMeta', () => {
  assert.equal(formatLeaveRange('2026-10-09T00:00:00.000Z', '2026-10-09'), '2026-10-09');
  assert.equal(formatLeaveRange('2026-10-09', '2026-10-11'), '2026-10-09 → 2026-10-11');
  assert.equal(
    applicantMeta({ kind: 'student', className: '5', sectionName: 'A', admissionNumber: '12' }),
    '5 · A · #12',
  );
  assert.equal(applicantMeta({ kind: 'staff', designation: 'Teacher' }), 'Teacher');
});

test('keptAsLeaveCount counts only rows changed to absent on a leave day', () => {
  const leave = { status: 'leave', leaveRequestId: 'r1' };
  const roster = [
    { studentId: 'a', attendance: leave },
    { studentId: 'b', attendance: leave },
    { studentId: 'c', attendance: { status: 'present' } },
  ];
  assert.equal(
    keptAsLeaveCount(roster, [{ studentId: 'a', status: 'leave' }, { studentId: 'b', status: 'leave' }], 'studentId'),
    0,
  );
  assert.equal(
    keptAsLeaveCount(
      roster,
      [
        { studentId: 'a', status: 'absent' },
        { studentId: 'b', status: 'present' },
        { studentId: 'c', status: 'absent' },
      ],
      'studentId',
    ),
    1,
  );
  assert.equal(
    keptAsLeaveCount([{ staffId: 's', attendance: leave }], [{ staffId: 's', status: 'absent' }], 'staffId'),
    1,
  );
  assert.equal(keptAsLeaveCount(undefined, undefined, 'staffId'), 0);
});

test('keptAsLeaveMessage', () => {
  assert.equal(keptAsLeaveMessage(0), '');
  assert.equal(keptAsLeaveMessage(1), '1 on approved leave was kept as leave');
  assert.equal(keptAsLeaveMessage(5), '5 on approved leave were kept as leave');
});
