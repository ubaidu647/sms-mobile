// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addonPayload,
  addonPricesPayload,
  addonPricesToForm,
  addonRenewalTotal,
  addonsWithInvoices,
  addonTotals,
  effectiveLimit,
  formatLimit,
  limitBreakdown,
  listedAddonPrices,
  addonModuleKeys,
  addonPeriodValue,
  addonUnits,
  buyableModuleOffers,
  carriedAddons,
  listedModulePrices,
  moduleAddonPricesPayload,
  moduleAddonPricesToForm,
  moduleName,
} from './planAddons.js';

const sub = {
  computedLimits: { noOfStudents: 300, noOfBranches: 2, noOfStaffs: 20, noOfSections: 10 },
  customLimits: { noOfStaffs: 25 },
  addonLimits: { noOfStudents: 100 },
};

test('effective limit = (override ?? plan limit) + add-on units', () => {
  assert.equal(effectiveLimit(sub, 'noOfStudents'), 400);
  assert.equal(effectiveLimit(sub, 'noOfStaffs'), 25);
  assert.equal(effectiveLimit(sub, 'noOfBranches'), 2);
  assert.equal(effectiveLimit({ ...sub, customLimits: { noOfStudents: 500 } }, 'noOfStudents'), 600);
});

test('a custom limit of 0 is an override, not a missing value', () => {
  assert.equal(effectiveLimit({ ...sub, customLimits: { noOfStudents: 0 } }, 'noOfStudents'), 100);
});

test('no limit on record stays unknown (∞), add-ons or not', () => {
  assert.equal(effectiveLimit({ addonLimits: { noOfStudents: 5 } }, 'noOfStudents'), null);
  assert.equal(effectiveLimit(null, 'noOfStudents'), null);
  assert.equal(formatLimit({}, 'noOfStudents'), '∞');
});

test('history rows without addonLimits sum their addons list', () => {
  const row = {
    computedLimits: { noOfStudents: 300 },
    addons: [
      { resource: 'noOfStudents', quantity: 100, unitPrice: 10 },
      { resource: 'noOfStudents', quantity: 50, unitPrice: 12 },
      { resource: 'noOfBranches', quantity: 1, unitPrice: 500 },
    ],
  };
  assert.deepEqual(addonTotals(row), { noOfStudents: 150, noOfBranches: 1 });
  assert.deepEqual(limitBreakdown(row, 'noOfStudents'), { base: 300, extra: 150, total: 450 });
});

test('formatLimit shows the add-on breakdown only when there is one', () => {
  assert.equal(formatLimit(sub, 'noOfStudents'), '400 (300 + 100 add-on)');
  assert.equal(formatLimit(sub, 'noOfBranches'), '2');
  assert.equal(
    formatLimit(sub, 'noOfStudents', ({ total, base, extra }) => `${total}=${base}+${extra}`),
    '400=300+100',
  );
});

test('listedAddonPrices keeps only listed prices, in display order', () => {
  assert.deepEqual(
    listedAddonPrices({ noOfSections: 50, noOfStudents: 10, noOfBranches: null, noOfStaffs: 0 }),
    [['noOfStudents', 10], ['noOfStaffs', 0], ['noOfSections', 50]],
  );
  assert.deepEqual(listedAddonPrices(undefined), []);
});

test('addonsWithInvoices: only an unpaid add-on invoice is removable', () => {
  const invoices = [
    { _id: 'i1', type: 'addon', status: 'unpaid' },
    { _id: 'i2', type: 'addon', status: 'paid' },
    { _id: 'i3', type: 'renewal', status: 'unpaid' },
    { _id: 'i4', type: 'addon', status: 'void' },
  ];
  const rows = addonsWithInvoices(
    [
      { _id: 'a1', invoiceId: 'i1' },
      { _id: 'a2', invoiceId: 'i2' },
      { _id: 'a3', invoiceId: 'i3' },
      { _id: 'a4', invoiceId: 'i4' },
      { _id: 'a5' },
    ],
    invoices,
  );
  assert.deepEqual(rows.map((r) => r.removable), [true, false, false, false, false]);
  // As the server counts it: no invoice = nothing owed = paid.
  assert.deepEqual(rows.map((r) => r.paid), [false, true, false, false, true]);
  assert.equal(rows[0].invoice.status, 'unpaid');
});

test('addonRenewalTotal bills each add-on for a full period, rescaled on a new length', () => {
  const addons = [
    { quantity: 100, unitPrice: 10 },
    { quantity: 2, unitPrice: 500 },
  ];
  assert.equal(addonRenewalTotal(addons, 30, 30), 2000);
  assert.equal(addonRenewalTotal(addons, 30, 60), 4000);
  assert.equal(addonRenewalTotal(addons, 0, 60), 2000);
  assert.equal(addonRenewalTotal([], 30, 30), 0);
});

test('addonPayload validates quantity and unit price; blank price uses the plan\'s', () => {
  const base = { schoolId: 's1', resource: 'noOfStudents' };
  assert.deepEqual(addonPayload({ ...base, quantity: '100', unitPrice: '' }).payload, {
    schoolId: 's1',
    resource: 'noOfStudents',
    quantity: 100,
  });
  assert.equal(addonPayload({ ...base, quantity: '5', unitPrice: '12.5' }).payload.unitPrice, 12.5);
  assert.equal(addonPayload({ ...base, quantity: '5', unitPrice: '0' }).payload.unitPrice, 0);
  for (const quantity of ['', '0', '-1', '1.5', 'abc', '100001']) {
    assert.equal(addonPayload({ ...base, quantity }).error, 'quantity', quantity);
  }
  assert.equal(addonPayload({ ...base, quantity: '1', unitPrice: '-2' }).error, 'unitPrice');
  assert.equal(addonPayload({ ...base, quantity: '1', unitPrice: 'x' }).error, 'unitPrice');
  assert.equal(addonPayload({ ...base, resource: 'nope', quantity: '1' }).error, 'resource');
});

test('package add-on prices: blank → null, numbers kept, negatives refused', () => {
  assert.deepEqual(addonPricesToForm({ noOfStudents: 10, noOfBranches: null, noOfStaffs: 0 }), {
    noOfStudents: '10',
    noOfBranches: '',
    noOfStaffs: '0',
    noOfSections: '',
    storageGB: '',
  });
  assert.deepEqual(
    addonPricesPayload({ noOfStudents: '10', noOfBranches: '', noOfStaffs: '0', noOfSections: '  ', storageGB: '50' }),
    { addonPrices: { noOfStudents: 10, noOfBranches: null, noOfStaffs: 0, noOfSections: null, storageGB: 50 } },
  );
  assert.deepEqual(addonPricesPayload({ noOfStaffs: '-1' }), { error: 'noOfStaffs' });
  assert.deepEqual(addonPricesPayload(undefined).addonPrices.noOfStudents, null);
});

// ── Storage and module add-ons ──

test('storage GB is a limit add-on; an absent storage limit is unlimited', () => {
  const row = {
    computedLimits: { noOfStudents: 300, storageGB: 2 },
    addons: [
      { resource: 'storageGB', quantity: 3, unitPrice: 100 },
      { resource: 'module', module: 'whatsapp', quantity: 1, unitPrice: 900 },
    ],
  };
  assert.deepEqual(limitBreakdown(row, 'storageGB'), { base: 2, extra: 3, total: 5 });
  assert.equal(effectiveLimit({ computedLimits: {} }, 'storageGB'), null);
  // Module add-ons never count as limit units.
  assert.deepEqual(addonTotals(row), { storageGB: 3 });
  assert.deepEqual(
    listedAddonPrices({ storageGB: 100, noOfStudents: null }),
    [['storageGB', 100]],
  );
});

test('addonPayload: storage takes a quantity in GB', () => {
  assert.deepEqual(addonPayload({ schoolId: 's1', resource: 'storageGB', quantity: '5' }).payload, {
    schoolId: 's1',
    resource: 'storageGB',
    quantity: 5,
  });
});

test('addonPayload: a module add-on sends the module and no quantity', () => {
  assert.deepEqual(
    addonPayload({ schoolId: 's1', resource: 'module', module: 'whatsapp', quantity: '' }).payload,
    { schoolId: 's1', resource: 'module', module: 'whatsapp' },
  );
  assert.equal(
    addonPayload({ schoolId: 's1', resource: 'module', module: 'library', unitPrice: '800' }).payload
      .unitPrice,
    800,
  );
  assert.equal(addonPayload({ schoolId: 's1', resource: 'module', module: 'nope' }).error, 'module');
  assert.equal(addonPayload({ schoolId: 's1', resource: 'module' }).error, 'module');
  assert.equal(
    addonPayload({ schoolId: 's1', resource: 'module', module: 'library', unitPrice: '-1' }).error,
    'unitPrice',
  );
});

test('a module add-on is one unit × its unit price', () => {
  const mod = { resource: 'module', module: 'whatsapp', unitPrice: 900 };
  assert.equal(addonUnits(mod), 1);
  assert.equal(addonUnits({ ...mod, quantity: 3 }), 1);
  assert.equal(addonPeriodValue(mod), 900);
  assert.equal(addonPeriodValue({ resource: 'noOfStudents', quantity: 10, unitPrice: 12.5 }), 125);
  assert.equal(addonRenewalTotal([mod, { quantity: 2, unitPrice: 50 }], 30, 30), 1000);
  assert.equal(addonRenewalTotal([mod], 30, 60), 1800);
});

test('carriedAddons drops module add-ons the renewed plan now includes', () => {
  const addons = [
    { resource: 'noOfStudents', quantity: 10, unitPrice: 5 },
    { resource: 'module', module: 'whatsapp', unitPrice: 900 },
    { resource: 'module', module: 'library', unitPrice: 500 },
  ];
  const kept = (features) => carriedAddons(addons, features).map((a) => a.module ?? a.resource);
  assert.deepEqual(kept(['core', 'leave']), ['noOfStudents', 'whatsapp', 'library']);
  assert.deepEqual(kept(['core', 'library']), ['noOfStudents', 'whatsapp']);
  // A plan opening every module carries no module add-on.
  assert.deepEqual(kept([]), ['noOfStudents']);
  assert.deepEqual(kept(undefined), ['noOfStudents']);
});

test('addonModuleKeys prefers the server list, else reads the add-ons', () => {
  assert.deepEqual(addonModuleKeys({ addonModules: ['library'] }), ['library']);
  assert.deepEqual(
    addonModuleKeys({
      addons: [
        { resource: 'module', module: 'whatsapp' },
        { resource: 'noOfStudents', quantity: 1 },
        { resource: 'module', module: 'whatsapp' },
      ],
    }),
    ['whatsapp'],
  );
  assert.deepEqual(addonModuleKeys(null), []);
});

test('buyableModuleOffers pairs each buyable module with its price', () => {
  assert.deepEqual(
    buyableModuleOffers({
      buyableModules: ['library', 'whatsapp', 'bogus'],
      moduleAddonPrices: { library: 500, whatsapp: null },
    }),
    [{ key: 'library', price: 500 }, { key: 'whatsapp', price: null }],
  );
  assert.deepEqual(buyableModuleOffers({}), []);
});

test('moduleName gives the English name, or the translated one', () => {
  assert.equal(moduleName('whatsapp'), 'WhatsApp');
  assert.equal(moduleName('staff-salary'), 'Staff Salary');
  assert.equal(moduleName('library', (k) => `[${k}]`), '[library]');
});

test('package module add-on prices: only modules the plan lacks are sold', () => {
  const form = moduleAddonPricesToForm({ whatsapp: 900, library: 0 });
  assert.equal(form.whatsapp, '900');
  assert.equal(form.library, '0');
  assert.equal(form.transport, '');
  const { moduleAddonPrices } = moduleAddonPricesPayload(
    { ...form, transport: ' 300 ' },
    ['library'],
  );
  assert.equal(moduleAddonPrices.whatsapp, 900);
  assert.equal(moduleAddonPrices.transport, 300);
  // Included in the plan → not sold as an add-on.
  assert.equal(moduleAddonPrices.library, null);
  assert.equal(moduleAddonPrices.leave, null);
  assert.deepEqual(moduleAddonPricesPayload({ whatsapp: '-5' }), { error: 'whatsapp' });
  assert.deepEqual(listedModulePrices({ whatsapp: 900, library: null, admissions: 0 }), [
    ['admissions', 0],
    ['whatsapp', 900],
  ]);
});
