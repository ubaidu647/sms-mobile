// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CLIENT_PLATFORM_HEADER, clientPlatformValue } from './clientPlatform.js';

test('phone OSes pass through', () => {
  assert.equal(clientPlatformValue('android'), 'android');
  assert.equal(clientPlatformValue('ios'), 'ios');
});

test('anything else is web', () => {
  for (const os of ['web', 'windows', 'macos', undefined, null, '']) {
    assert.equal(clientPlatformValue(os), 'web');
  }
});

test('header name matches the backend', () => {
  assert.equal(CLIENT_PLATFORM_HEADER.toLowerCase(), 'x-client-platform');
});
