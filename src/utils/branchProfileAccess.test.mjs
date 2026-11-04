// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { canEditBranchProfile } from './branchProfileAccess.js';

const u = (actions, branchId = 'b1', extra = {}) => ({
  branchId,
  role: { actions, ...extra },
});

test('predefined admin can always edit', () => {
  const admin = u([], 'b1', { isPredefined: true });
  assert.equal(canEditBranchProfile(admin, { profileExists: true, targetBranchId: 'b2' }), true);
  assert.equal(canEditBranchProfile(admin, { profileExists: false, targetBranchId: 'b2' }), true);
});

test('existing profile needs update, not create', () => {
  assert.equal(canEditBranchProfile(u(['create-branch-profile']), { profileExists: true }), false);
  assert.equal(canEditBranchProfile(u(['create-all-branch-profile']), { profileExists: true }), false);
  assert.equal(canEditBranchProfile(u(['update-branch-profile']), { profileExists: true }), true);
});

test('first profile needs create, not update', () => {
  assert.equal(canEditBranchProfile(u(['update-branch-profile']), { profileExists: false }), false);
  assert.equal(canEditBranchProfile(u(['update-all-branch-profile']), { profileExists: false }), false);
  assert.equal(canEditBranchProfile(u(['create-branch-profile']), { profileExists: false }), true);
});

test('branch-level permission only covers own branch', () => {
  const user = u(['update-branch-profile']);
  assert.equal(canEditBranchProfile(user, { profileExists: true, targetBranchId: 'b1' }), true);
  assert.equal(canEditBranchProfile(user, { profileExists: true, targetBranchId: { _id: 'b1' } }), true);
  assert.equal(canEditBranchProfile(user, { profileExists: true, targetBranchId: 'b2' }), false);
  assert.equal(canEditBranchProfile(u(['update-branch-profile'], ''), { profileExists: true }), false);
});

test('populated user branch is recognised', () => {
  const user = u(['create-branch-profile'], { _id: 'b1', name: 'Main' });
  assert.equal(canEditBranchProfile(user, { profileExists: false, targetBranchId: 'b1' }), true);
});

test('all-branch permission covers any branch', () => {
  assert.equal(
    canEditBranchProfile(u(['update-all-branch-profile']), { profileExists: true, targetBranchId: 'b9' }),
    true,
  );
  assert.equal(
    canEditBranchProfile(u(['create-all-branch-profile']), { profileExists: false, targetBranchId: 'b9' }),
    true,
  );
});

test('no user / no role → false', () => {
  assert.equal(canEditBranchProfile(null, { profileExists: true }), false);
  assert.equal(canEditBranchProfile({}, { profileExists: false }), false);
});
