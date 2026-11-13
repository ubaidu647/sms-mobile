// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  emptiedRequiredMessage,
  nestedFormPatch,
  scalarFormEntries,
} from './scalarFormEntries.js';

const entries = (...args) => Object.fromEntries(scalarFormEntries(...args));

test('create drops blanks and stringifies the rest', () => {
  assert.deepEqual(
    entries({ name: 'Ali', phone: '', salary: 0, dob: null }, ['name', 'phone', 'salary', 'dob']),
    { name: 'Ali', salary: '0' },
  );
});

test('edit sends an emptied field as an empty string', () => {
  assert.deepEqual(
    entries({ phone: '', religion: 'Islam' }, ['phone', 'religion'], {
      initial: { phone: '0300', religion: 'Islam' },
    }),
    { phone: '', religion: 'Islam' },
  );
});

test('a number field the form turned to null is cleared too', () => {
  assert.deepEqual(entries({ salary: null }, ['salary'], { initial: { salary: '5000' } }), {
    salary: '',
  });
});

test('a salary the response left out is not sent back as a clear', () => {
  assert.deepEqual(entries({ name: 'Ali', salary: null }, ['name', 'salary'], {
    initial: { name: 'Ali', salary: '' },
  }), { name: 'Ali' });
});

test('a zero is a value, not a blank, on both sides', () => {
  assert.deepEqual(entries({ feeDiscount: '' }, ['feeDiscount'], { initial: { feeDiscount: '0' } }), {
    feeDiscount: '',
  });
  assert.deepEqual(entries({ feeDiscount: 0 }, ['feeDiscount'], { initial: { feeDiscount: '' } }), {
    feeDiscount: '0',
  });
});

test('a field the form opened without is not sent: a list row is a partial record', () => {
  assert.deepEqual(
    entries({ bForm: '', feeNotes: '' }, ['bForm', 'feeNotes'], {
      initial: { bForm: '', feeNotes: undefined },
    }),
    {},
  );
});

test('a required field is never sent blank', () => {
  assert.deepEqual(
    entries({ name: '', phone: '' }, ['name', 'phone'], {
      initial: { name: 'Ali', phone: '0300' },
      required: ['name'],
    }),
    { phone: '' },
  );
});

test('a field outside the list is ignored', () => {
  assert.deepEqual(entries({ name: 'Ali', extra: 'x' }, ['name']), { name: 'Ali' });
});

const ADDRESS = { street: 'street', city: 'city' };

test('create leaves blank nested keys out, and an all-blank object is not sent', () => {
  assert.deepEqual(nestedFormPatch(ADDRESS, { street: 'Main', city: '' }), { street: 'Main' });
  assert.equal(nestedFormPatch(ADDRESS, { street: '', city: '' }), null);
});

test('emptying every key of an object still sends them all, so they clear', () => {
  assert.deepEqual(
    nestedFormPatch(ADDRESS, { street: '', city: '' }, { initial: { street: 'Main', city: 'Lhr' } }),
    { street: '', city: '' },
  );
});

test('an object that opened empty and stayed empty is not sent', () => {
  assert.equal(
    nestedFormPatch(ADDRESS, { street: '', city: '' }, { initial: { street: '', city: '' } }),
    null,
  );
});

test('a key never set stays out of an edit: the API refuses a blank required key', () => {
  assert.deepEqual(
    nestedFormPatch(ADDRESS, { street: 'New', city: '' }, { initial: { street: 'Old', city: '' } }),
    { street: 'New' },
  );
});

test('a monthly income the form turned to null is cleared; a typed 0 is kept as a number', () => {
  const keys = { monthlyIncome: 'income' };
  assert.deepEqual(nestedFormPatch(keys, { income: null }, { initial: { income: '50000' } }), {
    monthlyIncome: '',
  });
  assert.deepEqual(nestedFormPatch(keys, { income: 0 }, { initial: { income: '50000' } }), {
    monthlyIncome: 0,
  });
});

const REQUIRED = { name: 'Name is required', fatherName: "Father's name is required" };

test('an emptied required field blocks the save with its message', () => {
  assert.equal(
    emptiedRequiredMessage({ name: 'Ali', fatherName: '' }, { name: 'Ali', fatherName: 'Omar' }, REQUIRED),
    "Father's name is required",
  );
});

test('a required field that opened blank does not block: the record never had it', () => {
  assert.equal(emptiedRequiredMessage({ name: 'Ali', fatherName: '' }, { name: 'Ali' }, REQUIRED), null);
});
