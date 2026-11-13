// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createToastTracker } from './toastTracker.js';

const setup = () => {
  const shown = [];
  let clock = 100;
  const tracker = createToastTracker((p) => shown.push(p), () => clock);
  return { shown, tracker, tick: (t) => (clock = t) };
};

test('forwards the params to the real show', () => {
  const { shown, tracker } = setup();
  tracker.show({ type: 'error', text1: 'Failed' });
  assert.equal(shown.length, 1);
  assert.equal(shown[0].text1, 'Failed');
});

test('a toast shown since the modal opened is still live, with its own params', () => {
  const { tracker } = setup();
  const params = { type: 'success', text1: 'Saved' };
  tracker.show(params);
  assert.equal(tracker.liveSince(100), params);
});

test('a toast older than the modal stays where it is', () => {
  const { tracker, tick } = setup();
  tracker.show({ text1: 'Before' });
  tick(200);
  assert.equal(tracker.liveSince(150), null);
});

test('a hidden toast is not live, and its own onHide still runs', () => {
  const { shown, tracker } = setup();
  let hid = 0;
  tracker.show({ text1: 'Bye', onHide: () => (hid += 1) });
  shown[0].onHide();
  assert.equal(tracker.liveSince(0), null);
  assert.equal(hid, 1);
});

test('the hide of a replaced toast does not forget the new one', () => {
  const { shown, tracker } = setup();
  tracker.show({ text1: 'First' });
  tracker.show({ text1: 'Second' });
  shown[0].onHide();
  assert.equal(tracker.liveSince(0).text1, 'Second');
});

test('nothing shown, nothing live', () => {
  assert.equal(setup().tracker.liveSince(0), null);
});
