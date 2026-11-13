// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BYTES_PER_GB,
  STORAGE_FULL_FALLBACK,
  formatBytes,
  isStorageLimitError,
  storageLimitMessage,
  storageLimitPayload,
  storageLimitToForm,
  storageUsage,
} from './storageUsage.js';

test('formatBytes matches the server wording', () => {
  assert.equal(formatBytes(1.9 * BYTES_PER_GB), '1.9 GB');
  assert.equal(formatBytes(2 * BYTES_PER_GB), '2 GB');
  assert.equal(formatBytes(350 * 1024 ** 2), '350 MB');
  assert.equal(formatBytes(0), '0 MB');
  assert.equal(formatBytes(undefined), '0 MB');
});

test('storageUsage: ratio, bar fill and the 90% warning', () => {
  const half = storageUsage({ usedBytes: BYTES_PER_GB, limitGB: 2 });
  assert.equal(half.percent, 50);
  assert.equal(half.warn, false);
  const near = storageUsage({ usedBytes: 1.8 * BYTES_PER_GB, limitGB: 2 });
  assert.equal(near.warn, true);
  assert.equal(near.full, false);
  const over = storageUsage({ usedBytes: 3 * BYTES_PER_GB, limitGB: 2 });
  assert.equal(over.percent, 100);
  assert.equal(over.full, true);
  const zero = storageUsage({ usedBytes: 10, limitGB: 0 });
  assert.equal(zero.full, true);
});

test('storageUsage: no limit is unlimited and never warns', () => {
  const u = storageUsage({ usedBytes: 5 * BYTES_PER_GB, limitGB: null });
  assert.equal(u.ratio, null);
  assert.equal(u.warn, false);
  assert.equal(storageUsage(undefined), null);
});

test('storage-full errors are recognised by status and code', () => {
  const err = {
    response: {
      status: 403,
      data: { code: 'STORAGE_LIMIT_REACHED', message: 'Storage full: 1.9 GB of 2 GB used.' },
    },
  };
  assert.equal(isStorageLimitError(err), true);
  assert.equal(storageLimitMessage(err), 'Storage full: 1.9 GB of 2 GB used.');
  assert.equal(
    storageLimitMessage({ response: { status: 403, data: { code: 'STORAGE_LIMIT_REACHED' } } }),
    STORAGE_FULL_FALLBACK,
  );
  assert.equal(isStorageLimitError({ response: { status: 403, data: { code: 'PLAN_FEATURE_DISABLED' } } }), false);
  assert.equal(isStorageLimitError({ response: { status: 400, data: { code: 'STORAGE_LIMIT_REACHED' } } }), false);
  assert.equal(storageLimitMessage({ response: { status: 500 } }), null);
});

test('package storage limit: blank is unlimited', () => {
  assert.equal(storageLimitToForm({ storageGB: 5 }), '5');
  assert.equal(storageLimitToForm({}), '');
  assert.equal(storageLimitPayload(''), null);
  assert.equal(storageLimitPayload('  '), null);
  assert.equal(storageLimitPayload('10'), 10);
  assert.equal(storageLimitPayload('0'), 0);
  assert.equal(storageLimitPayload('-1'), undefined);
  assert.equal(storageLimitPayload('x'), undefined);
});
