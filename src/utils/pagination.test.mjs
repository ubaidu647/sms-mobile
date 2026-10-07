// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pageCount } from './pagination.js';

test('pageCount is at least 1 and rounds up', () => {
  assert.equal(pageCount(0, 20), 1);
  assert.equal(pageCount(20, 20), 1);
  assert.equal(pageCount(21, 20), 2);
  assert.equal(pageCount(undefined, 20), 1);
  assert.equal(pageCount(5, 0), 5);
});

