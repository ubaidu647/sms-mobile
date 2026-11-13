// Run: node --experimental-detect-module --test <this file>
import test from "node:test";
import assert from "node:assert/strict";

import {
  skippedUnmarkedMessage,
  withUnpaidLeaveRule,
} from "./attendanceMark.js";

test("withUnpaidLeaveRule turns unpaid leave unpaid", () => {
  assert.deepEqual(withUnpaidLeaveRule({ leaveType: "unpaid", isPaid: true }), {
    leaveType: "unpaid",
    isPaid: false,
  });
  const sick = { leaveType: "sick", isPaid: true };
  assert.equal(withUnpaidLeaveRule(sick), sick);
  assert.equal(withUnpaidLeaveRule(undefined), undefined);
});

test("skippedUnmarkedMessage only above zero", () => {
  assert.equal(skippedUnmarkedMessage(0), "");
  assert.equal(skippedUnmarkedMessage(undefined), "");
  assert.equal(
    skippedUnmarkedMessage(1),
    "1 student was not saved: no mark on this date to correct",
  );
  assert.equal(
    skippedUnmarkedMessage(3),
    "3 students were not saved: no mark on this date to correct",
  );
});
