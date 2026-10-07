// Run: node --experimental-detect-module --test <this file>
// The Karachi cases re-run this file's checks in a child process with
// TZ=Asia/Karachi so the "just after local midnight" bug is exercised for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { addDaysYMD, localYM, localYMD, monthsAgoYMD, startOfWeekYMD } from './localDate.js';

test('localYMD / localYM use local calendar parts, zero-padded', () => {
  assert.equal(localYMD(new Date(2026, 0, 5, 0, 30)), '2026-01-05');
  assert.equal(localYMD(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  assert.equal(localYM(new Date(2026, 0, 1, 0, 1)), '2026-01');
});

test('addDaysYMD crosses month, year and leap-day boundaries', () => {
  assert.equal(addDaysYMD('2026-10-07', -30), '2026-09-07');
  assert.equal(addDaysYMD('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysYMD('2024-02-28', 1), '2024-02-29');
  assert.equal(addDaysYMD('2026-03-01', -1), '2026-02-28');
  assert.equal(addDaysYMD('nope', 1), '');
});

test('startOfWeekYMD returns the Monday', () => {
  assert.equal(startOfWeekYMD('2026-10-07'), '2026-10-05'); // Wed
  assert.equal(startOfWeekYMD('2026-10-05'), '2026-10-05'); // Mon
  assert.equal(startOfWeekYMD('2026-10-11'), '2026-10-05'); // Sun
  assert.equal(startOfWeekYMD('2026-01-01'), '2025-12-29');
});

test('monthsAgoYMD clamps to the end of a shorter month', () => {
  assert.equal(monthsAgoYMD(3, new Date(2026, 4, 31, 12)), '2026-02-28');
  assert.equal(monthsAgoYMD(1, new Date(2026, 0, 15, 12)), '2025-12-15');
  assert.equal(monthsAgoYMD(0, new Date(2026, 9, 7, 1)), '2026-10-07');
});

const KARACHI_CHECK = `
  import { localYMD, localYM, addDaysYMD, startOfWeekYMD, monthsAgoYMD } from ${JSON.stringify(
    new URL('./localDate.js', import.meta.url).href,
  )};
  // 2026-10-07 02:30 in Karachi is 2026-10-06T21:30Z.
  const early = new Date('2026-10-06T21:30:00Z');
  const out = [
    early.toISOString().slice(0, 10),
    localYMD(early),
    localYM(new Date('2026-09-30T20:00:00Z')),
    addDaysYMD('2026-10-07', -1),
    startOfWeekYMD('2026-10-07'),
    monthsAgoYMD(1, early),
  ];
  process.stdout.write(JSON.stringify(out));
`;

test('in Asia/Karachi, 02:30 local is still "today"', () => {
  const args = ['--experimental-detect-module', '--input-type=module', '-e', KARACHI_CHECK];
  const raw = execFileSync(process.execPath, args, {
    env: { ...process.env, TZ: 'Asia/Karachi' },
    cwd: fileURLToPath(new URL('.', import.meta.url)),
  });
  const [utcDay, local, ym, prev, monday, monthAgo] = JSON.parse(String(raw));
  assert.equal(utcDay, '2026-10-06'); // the old, wrong answer
  assert.equal(local, '2026-10-07');
  assert.equal(ym, '2026-10'); // 01:00 on 1 Oct local
  assert.equal(prev, '2026-10-06');
  assert.equal(monday, '2026-10-05');
  assert.equal(monthAgo, '2026-09-07');
});
