// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAN_FEATURE_KEYS,
  describePlanFeatures,
  enabledPlanFeatures,
  featureForMenu,
  filterActionsByPlan,
  filterMenusByPlan,
  isFeatureEnabled,
  isPlanFeatureDisabledError,
  navItemState,
  normalizeLockedModuleDisplay,
  normalizeStatusFeatures,
  packageFeatureSelection,
  packageFeaturesPayload,
} from './planFeatures.js';
import { AVAILABLE_ACTIONS, AVAILABLE_MENUS } from '../constants/rolePermissions.js';

test('the catalogue matches the backend list', () => {
  assert.deepEqual(PLAN_FEATURE_KEYS, [
    'admissions',
    'certificates',
    'library',
    'inventory',
    'leave',
    'staff-attendance',
    'staff-salary',
    'transport',
    'accounting',
    'whatsapp',
  ]);
});

test('isFeatureEnabled: null/undefined means all, no key means core', () => {
  assert.equal(isFeatureEnabled(null, 'library'), true);
  assert.equal(isFeatureEnabled(undefined, 'library'), true);
  assert.equal(isFeatureEnabled([], 'library'), false);
  assert.equal(isFeatureEnabled(['library'], 'library'), true);
  assert.equal(isFeatureEnabled(['library'], 'leave'), false);
  assert.equal(isFeatureEnabled([], null), true);
  assert.equal(isFeatureEnabled([], undefined), true);
});

test('normalizeStatusFeatures keeps known keys and fails open on anything else', () => {
  assert.equal(normalizeStatusFeatures(null), null);
  assert.equal(normalizeStatusFeatures(undefined), null);
  assert.equal(normalizeStatusFeatures('leave'), null);
  assert.deepEqual(normalizeStatusFeatures([]), []);
  assert.deepEqual(normalizeStatusFeatures(['leave', 'core', 'bogus']), ['leave']);
});

test('enabledPlanFeatures follows the backend compatibility rules', () => {
  assert.equal(enabledPlanFeatures(undefined), null);
  assert.equal(enabledPlanFeatures([]), null);
  assert.equal(enabledPlanFeatures(['Unlimited SMS', 'Priority support']), null);
  assert.deepEqual(enabledPlanFeatures(['core']), []);
  assert.deepEqual(enabledPlanFeatures(['core', 'transport', 'leave']), ['leave', 'transport']);
  assert.deepEqual(enabledPlanFeatures(['library', 'free text']), ['library']);
});

test('menu keys map to their module', () => {
  const cases = {
    admissions: 'admissions',
    certificates: 'certificates',
    library: 'library',
    inventory: 'inventory',
    leave: 'leave',
    'my-leave': 'leave',
    'staff-attendance': 'staff-attendance',
    'salary-dashboard': 'staff-salary',
    'salary-structure': 'staff-salary',
    payslip: 'staff-salary',
    'salary-policy': 'staff-salary',
    vehicle: 'transport',
    route: 'transport',
    'transport-assignment': 'transport',
    account: 'accounting',
    journal: 'accounting',
    'account-mapping': 'accounting',
    'financial-report': 'accounting',
    'accounting-period': 'accounting',
    whatsapp: 'whatsapp',
  };
  for (const [menu, feature] of Object.entries(cases)) {
    assert.equal(featureForMenu(menu), feature, menu);
  }
  for (const core of ['student', 'fee', 'attendance', 'exam', 'role', 'report', 'unknown']) {
    assert.equal(featureForMenu(core), null, core);
  }
});

test('every gated menu of the mobile role catalogue maps to a known module', () => {
  for (const m of AVAILABLE_MENUS) {
    const f = featureForMenu(m.key);
    if (f !== null) assert.ok(PLAN_FEATURE_KEYS.includes(f), m.key);
  }
});

test('role filtering drops disabled modules only', () => {
  const menus = filterMenusByPlan(AVAILABLE_MENUS, ['leave']);
  const keys = menus.map((m) => m.key);
  assert.ok(keys.includes('student'));
  assert.ok(keys.includes('leave'));
  assert.ok(keys.includes('my-leave'));
  assert.ok(!keys.includes('vehicle'));
  assert.ok(!keys.includes('payslip'));
  assert.ok(!keys.includes('staff-attendance'));

  const actions = filterActionsByPlan(AVAILABLE_ACTIONS, ['leave']).map((a) => a.key);
  assert.ok(actions.includes('view-student'));
  assert.ok(actions.includes('apply-own-leave'));
  assert.ok(!actions.includes('view-vehicle'));
  assert.ok(!actions.includes('view-own-payslip'));

  assert.equal(filterMenusByPlan(AVAILABLE_MENUS, null).length, AVAILABLE_MENUS.length);
  assert.equal(filterActionsByPlan(AVAILABLE_ACTIONS, null).length, AVAILABLE_ACTIONS.length);
  assert.deepEqual(filterMenusByPlan(undefined, null), []);
});

test('navItemState honours the school display setting', () => {
  assert.equal(navItemState(null, 'leave', 'hide'), 'open');
  assert.equal(navItemState(['leave'], 'leave', 'hide'), 'open');
  assert.equal(navItemState([], null, 'hide'), 'open');
  assert.equal(navItemState([], 'leave', 'lock'), 'locked');
  assert.equal(navItemState([], 'leave', 'hide'), 'hidden');
  assert.equal(navItemState([], 'leave', undefined), 'locked');
  assert.equal(normalizeLockedModuleDisplay('hide'), 'hide');
  assert.equal(normalizeLockedModuleDisplay('bogus'), 'lock');
});

test('isPlanFeatureDisabledError recognises the plan refusal only', () => {
  const err = (status, code) => ({ response: { status, data: { code, message: 'x' } } });
  assert.equal(isPlanFeatureDisabledError(err(403, 'PLAN_FEATURE_DISABLED')), true);
  assert.equal(isPlanFeatureDisabledError(err(403, 'PLAN_DASHBOARD_DISABLED')), false);
  assert.equal(isPlanFeatureDisabledError(err(403, undefined)), false);
  assert.equal(isPlanFeatureDisabledError(err(400, 'PLAN_FEATURE_DISABLED')), false);
  assert.equal(isPlanFeatureDisabledError({ status: 403, code: 'PLAN_FEATURE_DISABLED' }), true);
  assert.equal(isPlanFeatureDisabledError(null), false);
});

test('package form: legacy lists open with everything ticked, saves carry core', () => {
  assert.deepEqual(packageFeatureSelection([]), PLAN_FEATURE_KEYS);
  assert.deepEqual(packageFeatureSelection(undefined), PLAN_FEATURE_KEYS);
  assert.deepEqual(packageFeatureSelection(['Unlimited SMS']), PLAN_FEATURE_KEYS);
  assert.deepEqual(packageFeatureSelection(['core']), []);
  assert.deepEqual(packageFeatureSelection(['core', 'whatsapp', 'leave']), ['leave', 'whatsapp']);

  assert.deepEqual(packageFeaturesPayload([]), ['core']);
  assert.deepEqual(packageFeaturesPayload(['whatsapp', 'leave', 'bogus', 'leave']), [
    'core',
    'leave',
    'whatsapp',
  ]);
  assert.deepEqual(packageFeaturesPayload(PLAN_FEATURE_KEYS), ['core', ...PLAN_FEATURE_KEYS]);
});

test('describePlanFeatures summarises a stored list', () => {
  assert.equal(describePlanFeatures([]), 'All modules');
  assert.equal(describePlanFeatures(['Unlimited SMS']), 'All modules');
  assert.equal(describePlanFeatures(['core']), 'Core only (no add-ons)');
  assert.equal(describePlanFeatures(['core', 'transport', 'leave']), 'Leave, Transport');
  assert.equal(
    describePlanFeatures(['core', 'leave'], { label: (k) => k.toUpperCase() }),
    'LEAVE',
  );
  assert.equal(describePlanFeatures(null, { all: 'Tout' }), 'Tout');
});
