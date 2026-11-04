// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveBackendUrl, parseHttpUrl, DEV_FALLBACK_BACKEND_URL } from './env.js';

test('development falls back to the local backend when unset', () => {
  assert.equal(resolveBackendUrl(undefined, true), DEV_FALLBACK_BACKEND_URL);
  assert.equal(resolveBackendUrl('  ', true), DEV_FALLBACK_BACKEND_URL);
});

test('development accepts plain http (LAN IP, emulator host)', () => {
  assert.equal(resolveBackendUrl('http://10.0.2.2:4000/api', true), 'http://10.0.2.2:4000/api');
});

test('a release build without the variable throws a clear message', () => {
  assert.throws(() => resolveBackendUrl(undefined, false), /EXPO_PUBLIC_BACKEND_URL is not set/);
  assert.throws(() => resolveBackendUrl('', false), /EXPO_PUBLIC_BACKEND_URL is not set/);
});

test('a release build refuses plain http and garbage', () => {
  assert.throws(() => resolveBackendUrl('http://api.example.com/api', false), /must be an https/);
  assert.throws(() => resolveBackendUrl('api.example.com', false), /must be an https/);
});

test('a release build accepts an https URL', () => {
  assert.equal(
    resolveBackendUrl(' https://api.example.com/api ', false),
    'https://api.example.com/api',
  );
});

test('EXPO_PUBLIC_ALLOW_INSECURE_BACKEND=1 lets a QA release build use http, loudly', () => {
  const warnings = [];
  const warn = (m) => warnings.push(m);
  assert.equal(
    resolveBackendUrl('http://192.168.1.20:4000/api', false, '1', warn),
    'http://192.168.1.20:4000/api',
  );
  assert.equal(
    resolveBackendUrl('http://staging.local/api', false, 'true', warn),
    'http://staging.local/api',
  );
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /ALLOW_INSECURE_BACKEND/);
  assert.match(warnings[0], /plain http/);
});

test('the opt-out does not cover a missing or garbage URL, and is off unless set', () => {
  const warn = () => {};
  assert.throws(() => resolveBackendUrl(undefined, false, '1', warn), /is not set/);
  assert.throws(() => resolveBackendUrl('api.example.com', false, '1', warn), /must be an https/);
  assert.throws(
    () => resolveBackendUrl('ftp://api.example.com', false, '1', warn),
    /must be an https/,
  );
  for (const off of [undefined, '', '0', 'false', 'yes']) {
    assert.throws(
      () => resolveBackendUrl('http://api.example.com/api', false, off, warn),
      /must be an https/,
    );
  }
});

test('https never warns, with or without the opt-out', () => {
  const warnings = [];
  const warn = (m) => warnings.push(m);
  assert.equal(
    resolveBackendUrl('https://api.example.com/api', false, '1', warn),
    'https://api.example.com/api',
  );
  assert.equal(warnings.length, 0);
});

test('a release build refuses malformed https values React Native URL would accept', () => {
  for (const bad of [
    'https:api',
    'https://',
    'https:///api',
    'https://api',
    'https://.example.com',
    'https://api..example.com',
    'https://-api.example.com',
    'https://api.example.com:0/api',
    'https://api.example.com:70000',
    'https://api.example.com:/api',
    'https://user:pw@api.example.com/api',
    'https://api example.com/api',
    'https://api.example.com/a b',
    'HTTPS//api.example.com',
  ]) {
    assert.throws(() => resolveBackendUrl(bad, false), /must be an https/, bad);
  }
});

test('a release build accepts https hosts with a dot or localhost, port and path optional', () => {
  for (const good of [
    'https://api.example.com',
    'https://api.example.com/',
    'https://api.example.com/api',
    'https://api.example.com:8443/api/v1',
    'https://10.0.0.5/api',
    'https://localhost:4000/api',
    'HTTPS://API.Example.com/api?x=1#y',
  ]) {
    assert.equal(resolveBackendUrl(good, false), good);
  }
});

test('parseHttpUrl reports scheme, host and port', () => {
  assert.deepEqual(parseHttpUrl('https://Api.Example.com:8443/api'), {
    protocol: 'https:',
    host: 'api.example.com',
    port: 8443,
  });
  assert.deepEqual(parseHttpUrl('http://localhost/api'), {
    protocol: 'http:',
    host: 'localhost',
    port: null,
  });
  assert.equal(parseHttpUrl('https:api'), null);
  assert.equal(parseHttpUrl('https://'), null);
  assert.equal(parseHttpUrl('ftp://api.example.com'), null);
  assert.equal(parseHttpUrl(undefined), null);
});
