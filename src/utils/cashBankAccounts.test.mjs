// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  accountPickerState,
  accountsForMethod,
  keptAccountId,
  methodToCashOrBank,
} from './cashBankAccounts.js';

const cash1 = { _id: 'c1', code: '1010', name: 'Cash box', category: 'cash' };
const bank1 = { _id: 'b1', code: '1020', name: 'HBL', category: 'bank' };
const bank2 = { _id: 'b2', code: '1021', name: 'UBL', category: 'bank' };
const accounts = [cash1, bank1, bank2];

test('methodToCashOrBank: only literal cash is cash', () => {
  assert.equal(methodToCashOrBank('cash'), 'cash');
  for (const m of ['bank-transfer', 'online', 'cheque', 'card', 'other', undefined]) {
    assert.equal(methodToCashOrBank(m), 'bank');
  }
});

test('accountsForMethod keeps the matching kind and tolerates a bad list', () => {
  assert.deepEqual(accountsForMethod(accounts, 'cash'), [cash1]);
  assert.deepEqual(accountsForMethod(accounts, 'cheque'), [bank1, bank2]);
  assert.deepEqual(accountsForMethod(undefined, 'cash'), []);
  assert.deepEqual(accountsForMethod([null, cash1], 'cash'), [cash1]);
});

test('accountPickerState offers a choice only when several accounts match', () => {
  assert.equal(accountPickerState({ accounts, method: 'online' }), 'choose');
  assert.equal(accountPickerState({ accounts, method: 'cash' }), 'hidden');
  assert.equal(accountPickerState({ accounts: [], method: 'cash' }), 'hidden');
});

test('accountPickerState: loading and failure never pretend to know the accounts', () => {
  assert.equal(accountPickerState({ method: 'cash', isLoading: true }), 'loading');
  assert.equal(accountPickerState({ method: 'cash', isError: true, errorStatus: 500 }), 'error');
  assert.equal(accountPickerState({ method: 'cash', isError: true }), 'error');
  assert.equal(accountPickerState({ method: 'cash', isError: true, errorStatus: 403 }), 'hidden');
  assert.equal(accountPickerState({ method: 'cash' }), 'hidden');
});

test('accountPickerState: a failed refresh keeps using the loaded list', () => {
  const state = accountPickerState({ accounts, method: 'cheque', isError: true, errorStatus: 500 });
  assert.equal(state, 'choose');
});

test('keptAccountId keeps a choice that is still valid', () => {
  assert.equal(keptAccountId(accounts, 'cheque', 'b2'), 'b2');
  // bank-transfer → online: both are bank, the choice stands.
  assert.equal(keptAccountId(accounts, 'online', 'b2'), 'b2');
});

test('keptAccountId drops a choice of the wrong kind, gone, or with nothing to choose', () => {
  assert.equal(keptAccountId(accounts, 'cash', 'b2'), '');
  assert.equal(keptAccountId(accounts, 'cheque', 'gone'), '');
  assert.equal(keptAccountId([cash1, bank1], 'cheque', 'b1'), '');
});

test('keptAccountId leaves things alone until the list has loaded', () => {
  assert.equal(keptAccountId(undefined, 'cash', 'b2'), 'b2');
  assert.equal(keptAccountId(undefined, 'cash', ''), '');
  assert.equal(keptAccountId(accounts, 'cash', ''), '');
});
