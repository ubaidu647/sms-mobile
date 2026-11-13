// Payslip display rules shared by the payslip screens and the generate form.

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * What a payslip line pays. A part-month payslip stores it on the line as
 * `payable` (already prorated); otherwise a percent line is that share of
 * basic and a fixed line is its own amount.
 */
export function payslipLineAmount(basic, line) {
  if (line?.payable != null) return round2(line.payable);
  const amount = Number(line?.amount) || 0;
  return round2(
    line?.type === "percent" ? ((Number(basic) || 0) * amount) / 100 : amount,
  );
}

/** "Days outside employment: X of Y", or '' when there are none. */
export function outsideEmploymentNote(attendance) {
  const outside = Number(attendance?.outsideEmploymentDays) || 0;
  const days = Number(attendance?.daysInMonth) || 0;
  if (outside <= 0 || days <= 0) return "";
  return `Days outside employment: ${outside} of ${days}`;
}

/** Text of the notice shown when no salary policy applied. */
export function fallbackPolicyNotice(attendance) {
  const base =
    "No salary policy was active at generation time — pro-rate fallback used (basic ÷ 26 × " +
    "unpaid days; absences and unpaid leave count 1, half-days ½";
  return outsideEmploymentNote(attendance)
    ? `${base}; days outside employment cost their share of the calendar month).`
    : `${base}).`;
}

const ymd = (d) => (d ? String(d).slice(0, 10) : "");

/**
 * Staff who can be paid for `month`: every active member, plus inactive ones
 * whose leaving date is on or after the month's first day (owed the months up
 * to and including the one they left in).
 */
export function payslipStaffOptions(active, inactive, month) {
  const list = Array.isArray(active) ? [...active] : [];
  if (!MONTH_RE.test(String(month ?? ""))) return list;
  const seen = new Set(list.map((s) => String(s?._id)));
  const from = `${month}-01`;
  for (const s of Array.isArray(inactive) ? inactive : []) {
    const left = ymd(s?.leavingDate);
    if (!left || left < from || seen.has(String(s?._id))) continue;
    seen.add(String(s._id));
    list.push(s);
  }
  return list;
}

/**
 * The month the staff list is built for while `typed` is being edited: the
 * typed month once it is a full YYYY-MM, otherwise the last full one. A
 * half-typed month ("2025-0") must not drop — and so deselect — a leaver.
 */
export function payslipListMonth(typed, previous) {
  const m = String(typed ?? "").trim();
  return MONTH_RE.test(m) ? m : previous;
}

/** "left 2025-09-10" for an inactive member with a leaving date, else ''. */
export function leaverTag(staff) {
  return staff && staff.isActive === false && staff.leavingDate
    ? `left ${ymd(staff.leavingDate)}`
    : "";
}
