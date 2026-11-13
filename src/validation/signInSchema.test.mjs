// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { signInSchema } from './signInSchema.js';

test('an email with surrounding spaces (autofill) is accepted, trimmed', async () => {
  const out = await signInSchema.validate({ email: ' a@b.co ', password: 'secret' });
  assert.equal(out.email, 'a@b.co');
});

test('a password keeps its spaces: they can be part of it', async () => {
  const out = await signInSchema.validate({ email: 'a@b.co', password: ' secret ' });
  assert.equal(out.password, ' secret ');
});

test('a blank email is refused as missing', async () => {
  await assert.rejects(signInSchema.validate({ email: '   ', password: 'secret' }), {
    message: 'Email is required',
  });
});

test('a malformed email is refused', async () => {
  await assert.rejects(signInSchema.validate({ email: 'nope', password: 'secret' }), {
    message: 'Invalid email',
  });
});
