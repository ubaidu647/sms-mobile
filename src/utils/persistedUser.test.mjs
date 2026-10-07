// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { persistableUser } from './persistedUser.js';

const role = { _id: 'r1', name: 'teacher', actions: ['view-exam'], menus: [], isPredefined: true };

test('keeps role, type and every id the app scopes queries by', () => {
  const user = {
    id: 'u1',
    _id: 'u1',
    type: 'staff',
    schoolId: 's1',
    branchId: 'b1',
    staffId: 'st1',
    studentId: null,
    staffType: 'teaching',
    role,
  };
  assert.deepEqual(persistableUser(user), user);
});

test('drops personal data', () => {
  const out = persistableUser({
    _id: 'u1',
    name: 'Ali Khan',
    email: 'ali@example.com',
    phone: '0300',
    avatar: 'https://x/y.png',
    role,
  });
  assert.deepEqual(out, { _id: 'u1', role });
});

test('populated refs keep only their ids (and branch name)', () => {
  const out = persistableUser({
    _id: 'u1',
    branchId: { _id: 'b1', name: 'Main', address: 'somewhere' },
    branch: { _id: 'b1', name: 'Main', phone: '042' },
    staff: { _id: 'st1', cnic: '35202-xxxxx' },
  });
  assert.deepEqual(out, {
    _id: 'u1',
    branchId: { _id: 'b1', name: 'Main' },
    branch: { _id: 'b1', name: 'Main' },
    staff: { _id: 'st1' },
  });
});

test('no user persists as null', () => {
  assert.equal(persistableUser(null), null);
  assert.equal(persistableUser(undefined), null);
});
