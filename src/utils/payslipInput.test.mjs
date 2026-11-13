// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  filterAmountInput,
  instalmentAmount,
  parseAmountInput,
  payslipMonthError,
} from './payslipInput.js';

test('filterAmountInput keeps digits, one dot and two decimals', () => {
  assert.equal(filterAmountInput('5000'), '5000');
  assert.equal(filterAmountInput('5,000 Rs'), '5000');
  assert.equal(filterAmountInput('12.'), '12.');
  assert.equal(filterAmountInput('12.34'), '12.34');
  assert.equal(filterAmountInput(''), '');
});

test('filterAmountInput refuses a second dot or a third decimal', () => {
  assert.equal(filterAmountInput('5000..', '5000.'), '5000.');
  assert.equal(filterAmountInput('5.000.00', ''), '');
  assert.equal(filterAmountInput('12.345', '12.34'), '12.34');
});

test('parseAmountInput: empty, valid and invalid', () => {
  assert.deepEqual(parseAmountInput(''), { empty: true, invalid: false, value: null });
  assert.deepEqual(parseAmountInput('  '), { empty: true, invalid: false, value: null });
  assert.equal(parseAmountInput('5000').value, 5000);
  assert.equal(parseAmountInput('12.5').value, 12.5);
  assert.equal(parseAmountInput('12.').value, 12);
  assert.equal(parseAmountInput('.5').value, 0.5);
  assert.equal(parseAmountInput('0').value, 0);
  for (const bad of ['5000..', '5.000.00', '.', 'abc', '1e3', '-5', '12.345', '1,000']) {
    const r = parseAmountInput(bad);
    assert.equal(r.invalid, true, bad);
    assert.equal(r.value, null, bad);
  }
});

test('instalmentAmount: an empty field sends the full remaining balance', () => {
  // Omitting it lets a held key replay an earlier instalment as a success.
  assert.deepEqual(instalmentAmount('', 600), { invalid: false, amount: 600 });
  assert.deepEqual(instalmentAmount('   ', 600), { invalid: false, amount: 600 });
  assert.deepEqual(instalmentAmount(null, 600.5), { invalid: false, amount: 600.5 });
});

test('instalmentAmount: a typed amount is used as typed', () => {
  assert.deepEqual(instalmentAmount('250.50', 600), { invalid: false, amount: 250.5 });
  // Range is the caller's check, as before.
  assert.deepEqual(instalmentAmount('0', 600), { invalid: false, amount: 0 });
  assert.deepEqual(instalmentAmount('700', 600), { invalid: false, amount: 700 });
});

test('instalmentAmount: unparseable text is refused, never read as empty', () => {
  assert.deepEqual(instalmentAmount('5..', 600), { invalid: true, amount: undefined });
});

test('instalmentAmount: nothing owed sends no amount, whatever is in the field', () => {
  for (const remaining of [0, -5, undefined, null]) {
    assert.deepEqual(instalmentAmount('', remaining), { invalid: false, amount: undefined });
    assert.deepEqual(instalmentAmount('5..', remaining), { invalid: false, amount: undefined });
  }
});

test('payslipMonthError refuses months after the current one', () => {
  assert.equal(payslipMonthError('2026-10', '2026-10'), null);
  assert.equal(payslipMonthError('2026-09', '2026-10'), null);
  assert.equal(payslipMonthError('2025-12', '2026-01'), null);
  assert.match(payslipMonthError('2026-11', '2026-10'), /future month/);
  assert.match(payslipMonthError('2027-01', '2026-12'), /future month/);
  assert.equal(payslipMonthError('', '2026-10'), 'Month is required');
  assert.match(payslipMonthError('2026-13', '2026-10'), /YYYY-MM/);
  assert.match(payslipMonthError('2026-1', '2026-10'), /YYYY-MM/);
});
