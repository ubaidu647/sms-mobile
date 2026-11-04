// Input rules for the payroll forms (generate, bulk, edit, pay). Number('5..')
// is NaN, and the forms used to drop a NaN field silently — for a payment that
// meant paying the full remaining balance instead of the amount typed.

import { localYM } from './localDate.js';

// Digits with at most one dot and at most 2 decimals; '5.' and '.5' are fine
// while typing.
const AMOUNT_TYPING_RE = /^\d*(\.\d{0,2})?$/;
// What may be submitted: at least one digit, at most one dot, 2 decimals.
const AMOUNT_RE = /^(\d+(\.\d{0,2})?|\.\d{1,2})$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Filter for an amount TextInput's onChangeText: strips anything but digits and
 * dots, and refuses an edit that would leave a second dot or a third decimal
 * (keeps `prev`). A pasted '5.000.00' is refused rather than reinterpreted.
 */
export function filterAmountInput(next, prev = '') {
  const cleaned = String(next ?? '').replace(/[^0-9.]/g, '');
  return AMOUNT_TYPING_RE.test(cleaned) ? cleaned : String(prev ?? '');
}

/**
 * Parse an amount field. Empty → { empty: true }; a valid non-negative number
 * → { value }; anything else (multiple dots, stray text) → { invalid: true }.
 */
export function parseAmountInput(text) {
  const s = String(text ?? '').trim();
  if (s === '') return { empty: true, invalid: false, value: null };
  if (!AMOUNT_RE.test(s)) return { empty: false, invalid: true, value: null };
  const value = Number(s);
  if (!Number.isFinite(value)) return { empty: false, invalid: true, value: null };
  return { empty: false, invalid: false, value };
}

/**
 * Why `month` can't be used to generate payslips, or null. Months after the
 * current one are refused: they have no attendance yet, so they would be paid
 * without deductions. The current month is allowed (schools pay on the 25th).
 */
export function payslipMonthError(month, current = localYM()) {
  const m = String(month ?? '').trim();
  if (!m) return 'Month is required';
  if (!MONTH_RE.test(m)) return 'Month must be in format YYYY-MM';
  if (m > current) return `Cannot generate payslips for a future month (after ${current})`;
  return null;
}
