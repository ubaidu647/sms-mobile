// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildVehiclePayload } from './vehiclePayload.js';

const blankForm = (over = {}) => ({
  registrationNumber: ' abc-123 ',
  vehicleType: 'bus',
  make: '',
  modelName: '',
  manufactureYear: '',
  color: '',
  fuelType: 'diesel',
  capacity: '40',
  ownership: 'owned',
  insuranceNumber: '',
  insuranceExpiry: '',
  fitnessExpiry: '',
  registrationExpiry: '',
  driver: { name: ' Ali ', phone: ' 0300 ', cnic: '', licenseNumber: ' L1 ', licenseExpiry: '' },
  conductor: { name: '', phone: '' },
  trackerId: '',
  notes: '',
  ...over,
});

const required = {
  registrationNumber: 'abc-123',
  vehicleType: 'bus',
  capacity: 40,
  fuelType: 'diesel',
  ownership: 'owned',
  driver: { name: 'Ali', phone: '0300', licenseNumber: 'L1' },
};

const stored = {
  make: 'Hino',
  modelName: 'AK',
  manufactureYear: 2015,
  color: 'White',
  insuranceNumber: 'I-1',
  insuranceExpiry: '2027-01-01T00:00:00.000Z',
  fitnessExpiry: '2027-02-01T00:00:00.000Z',
  registrationExpiry: '2027-03-01T00:00:00.000Z',
  driver: { cnic: '35202', licenseExpiry: '2027-04-01T00:00:00.000Z' },
  conductor: { name: 'Bilal', phone: '0311' },
  trackerId: 'T-9',
  notes: 'Old note',
};

test('create: blank optional fields are left out', () => {
  assert.deepEqual(buildVehiclePayload(blankForm()), required);
});

test('create: a conductor phone with no name is not recorded', () => {
  const form = blankForm({ conductor: { name: '', phone: '0311' } });
  assert.equal(buildVehiclePayload(form).conductor, undefined);
});

test('create: filled optional fields are trimmed and sent', () => {
  const payload = buildVehiclePayload(
    blankForm({
      make: ' Hino ',
      manufactureYear: '2015',
      insuranceExpiry: '2027-01-01',
      conductor: { name: ' Bilal ', phone: '' },
      notes: ' Hi ',
    }),
  );
  assert.equal(payload.make, 'Hino');
  assert.equal(payload.manufactureYear, 2015);
  assert.equal(payload.insuranceExpiry, '2027-01-01');
  assert.deepEqual(payload.conductor, { name: 'Bilal' });
  assert.equal(payload.notes, 'Hi');
});

test('edit: registrationNumber stays in the payload', () => {
  assert.equal(buildVehiclePayload(blankForm(), stored).registrationNumber, 'abc-123');
});

test('edit: every blanked optional field that had a value is sent cleared', () => {
  assert.deepEqual(buildVehiclePayload(blankForm(), stored), {
    ...required,
    driver: { ...required.driver, cnic: '', licenseExpiry: null },
    make: '',
    modelName: '',
    color: '',
    insuranceNumber: '',
    trackerId: '',
    notes: '',
    insuranceExpiry: null,
    fitnessExpiry: null,
    registrationExpiry: null,
    manufactureYear: null,
    conductor: { name: '', phone: '' },
  });
});

test('edit: whitespace counts as blank', () => {
  const payload = buildVehiclePayload(blankForm({ notes: '   ' }), { notes: 'Old note' });
  assert.equal(payload.notes, '');
});

test('edit: a field that was already blank is not sent', () => {
  assert.deepEqual(
    buildVehiclePayload(blankForm(), { notes: '', make: null, driver: {}, conductor: {} }),
    required,
  );
});

test('edit: a kept value is sent as is, not cleared', () => {
  const payload = buildVehiclePayload(blankForm({ notes: 'New', manufactureYear: 2016 }), stored);
  assert.equal(payload.notes, 'New');
  assert.equal(payload.manufactureYear, 2016);
});

test('edit: the conductor phone clears on its own', () => {
  const form = blankForm({ conductor: { name: 'Bilal', phone: '' } });
  assert.deepEqual(buildVehiclePayload(form, stored).conductor, { name: 'Bilal', phone: '' });
});

test('edit: the conductor name clears while the phone is kept', () => {
  const form = blankForm({ conductor: { name: '', phone: '0311' } });
  assert.deepEqual(buildVehiclePayload(form, stored).conductor, { name: '', phone: '0311' });
});

test('edit: no conductor before or after sends none', () => {
  assert.equal(buildVehiclePayload(blankForm(), { notes: 'x' }).conductor, undefined);
});
