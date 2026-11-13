// Run: node --experimental-detect-module --test <this file>
import test from "node:test";
import assert from "node:assert/strict";

import {
  fallbackPolicyNotice,
  leaverTag,
  outsideEmploymentNote,
  payslipLineAmount,
  payslipStaffOptions,
} from "./payslipDisplay.js";

test("payslipLineAmount prefers the stored prorated figure", () => {
  assert.equal(
    payslipLineAmount(30000, { type: "percent", amount: 10, payable: 1000 }),
    1000,
  );
  assert.equal(
    payslipLineAmount(30000, { type: "fixed", amount: 3000, payable: 0 }),
    0,
  );
  assert.equal(
    payslipLineAmount(33333, { type: "percent", amount: 7.5 }),
    2499.98,
  );
  assert.equal(payslipLineAmount(30000, { type: "fixed", amount: 3000 }), 3000);
  assert.equal(payslipLineAmount(30000, null), 0);
});

test("outsideEmploymentNote only for days outside employment", () => {
  assert.equal(
    outsideEmploymentNote({ outsideEmploymentDays: 20, daysInMonth: 30 }),
    "Days outside employment: 20 of 30",
  );
  assert.equal(
    outsideEmploymentNote({ outsideEmploymentDays: 0, daysInMonth: 30 }),
    "",
  );
  assert.equal(
    outsideEmploymentNote({ outsideEmploymentDays: 3, daysInMonth: 0 }),
    "",
  );
  assert.equal(outsideEmploymentNote(undefined), "");
});

test("fallbackPolicyNotice adds the employment clause when it applies", () => {
  assert.match(
    fallbackPolicyNotice({ outsideEmploymentDays: 5, daysInMonth: 30 }),
    /days outside employment/,
  );
  assert.doesNotMatch(fallbackPolicyNotice({}), /outside employment/);
  assert.match(fallbackPolicyNotice({}), /half-days ½\)\.$/);
});

test("payslipStaffOptions adds leavers still owed the month", () => {
  const active = [{ _id: "a", isActive: true }];
  const inactive = [
    { _id: "b", isActive: false, leavingDate: "2025-09-10T00:00:00.000Z" },
    { _id: "c", isActive: false, leavingDate: "2025-07-31T00:00:00.000Z" },
    { _id: "d", isActive: false },
    { _id: "e", isActive: false, leavingDate: "2025-08-01T00:00:00.000Z" },
  ];
  assert.deepEqual(
    payslipStaffOptions(active, inactive, "2025-08").map((s) => s._id),
    ["a", "b", "e"],
  );
  assert.deepEqual(
    payslipStaffOptions(active, inactive, "2025-09").map((s) => s._id),
    ["a", "b"],
  );
  assert.deepEqual(
    payslipStaffOptions(active, inactive, "").map((s) => s._id),
    ["a"],
  );
  assert.deepEqual(payslipStaffOptions(undefined, undefined, "2025-08"), []);
});

test("leaverTag names the leaving day of an inactive member", () => {
  assert.equal(
    leaverTag({ isActive: false, leavingDate: "2025-09-10T00:00:00.000Z" }),
    "left 2025-09-10",
  );
  assert.equal(leaverTag({ isActive: true, leavingDate: "2025-09-10" }), "");
  assert.equal(leaverTag(null), "");
});

import { payslipListMonth } from "./payslipDisplay.js";

test("payslipListMonth follows only complete months", () => {
  assert.equal(payslipListMonth("2025-09", "2025-08"), "2025-09");
  assert.equal(payslipListMonth(" 2025-10 ", "2025-08"), "2025-10");
  assert.equal(payslipListMonth("2025-0", "2025-08"), "2025-08");
  assert.equal(payslipListMonth("", "2025-08"), "2025-08");
  assert.equal(payslipListMonth("2025-13", "2025-08"), "2025-08");
});
