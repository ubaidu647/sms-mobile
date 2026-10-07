// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isSafeUrl } from './safeUrl.js';

test('https URLs are allowed', () => {
  assert.equal(isSafeUrl('https://res.cloudinary.com/x/raw/upload/a.pdf'), true);
  assert.equal(isSafeUrl('HTTPS://example.com'), true);
  assert.equal(isSafeUrl('https://example.com?x=1'), true);
  assert.equal(isSafeUrl('  https://example.com/a  '), true);
});

test('other schemes and malformed values are refused', () => {
  for (const v of [
    'http://example.com',
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'file:///etc/passwd',
    'intent://scan#Intent;scheme=zxing;end',
    'tel:123',
    'myapp://open',
    'data:text/html,hi',
    '//example.com',
    'https:example.com',
    'https://',
    'https:///path',
    'https://user@evil.com',
    'https://exa mple.com',
    'java\nscript:alert(1)',
    '',
    null,
    undefined,
    42,
  ]) {
    assert.equal(isSafeUrl(v), false, String(v));
  }
});
