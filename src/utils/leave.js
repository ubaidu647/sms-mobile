// Pure helpers for Leave Management (no React / RN imports so node tests can
// load them). Dates are calendar days as 'YYYY-MM-DD'; the server stores them
// as UTC midnight, so the first 10 chars of an ISO string are the day itself.

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

export const STAFF_LEAVE_TYPES = ['casual', 'sick', 'annual', 'unpaid', 'other'];
export const STUDENT_LEAVE_TYPES = ['sick', 'casual', 'other'];

export const MAX_LEAVE_SPAN_DAYS = 60;
export const REASON_MIN = 3;
export const REASON_MAX = 500;

export const LEAVE_STATUS_PILL = {
  pending: { label: 'Pending', bg: '#fef3c7', fg: '#92400e', icon: 'clock' },
  approved: { label: 'Approved', bg: '#dcfce7', fg: '#166534', icon: 'check-circle' },
  rejected: { label: 'Rejected', bg: '#fee2e2', fg: '#991b1b', icon: 'x-circle' },
  cancelled: { label: 'Cancelled', bg: '#f3f4f6', fg: '#374151', icon: 'slash' },
};

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' part of a date string / ISO timestamp; '' when absent. */
export function ymdOf(value) {
  if (!value) return '';
  const s = String(value).slice(0, 10);
  return YMD_RE.test(s) ? s : '';
}

/** True for a real calendar day in 'YYYY-MM-DD' form (rejects 2026-02-30). */
export function isValidYMD(s) {
  const m = YMD_RE.exec(String(s ?? ''));
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Inclusive calendar days from..to; 0 when either is invalid or to < from. */
export function calendarSpan(from, to) {
  if (!isValidYMD(from) || !isValidYMD(to)) return 0;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

export const leaveTypesFor = (applicantType) =>
  applicantType === 'student' ? STUDENT_LEAVE_TYPES : STAFF_LEAVE_TYPES;

/**
 * Client-side mirror of the server validation. Returns `{ field: message }`;
 * an empty object means the form may be submitted. `requireApplicant` is for
 * the management form, where a staff member or student must be picked.
 */
export function validateLeaveForm(form = {}, { requireApplicant = false } = {}) {
  const errors = {};
  const applicantType = form.applicantType || 'staff';
  if (requireApplicant) {
    if (applicantType !== 'staff' && applicantType !== 'student') {
      errors.applicantType = 'Choose staff or student';
    } else if (applicantType === 'staff' && !form.staffId) {
      errors.applicant = 'Pick a staff member';
    } else if (applicantType === 'student' && !form.studentId) {
      errors.applicant = 'Pick a student';
    }
  }
  if (!form.leaveType) {
    errors.leaveType = 'Leave type is required';
  } else if (!leaveTypesFor(applicantType).includes(form.leaveType)) {
    errors.leaveType = 'Leave type is not valid here';
  }
  const fromOk = isValidYMD(form.fromDate);
  const toOk = isValidYMD(form.toDate);
  if (!fromOk) errors.fromDate = 'Enter a real date (YYYY-MM-DD)';
  if (!toOk) errors.toDate = 'Enter a real date (YYYY-MM-DD)';
  if (fromOk && toOk) {
    if (form.toDate < form.fromDate) {
      errors.toDate = 'End date is before the start date';
    } else if (calendarSpan(form.fromDate, form.toDate) > MAX_LEAVE_SPAN_DAYS) {
      errors.toDate = `A request can cover at most ${MAX_LEAVE_SPAN_DAYS} days`;
    }
  }
  const reason = String(form.reason ?? '').trim();
  if (reason.length < REASON_MIN) {
    errors.reason = `Reason must be at least ${REASON_MIN} characters`;
  } else if (reason.length > REASON_MAX) {
    errors.reason = `Reason must be at most ${REASON_MAX} characters`;
  }
  return errors;
}

/** First error message of a `validateLeaveForm` result, or ''. */
export const firstError = (errors) => Object.values(errors || {})[0] || '';

/** Request body for the apply / create endpoints (trimmed, no empty fields). */
export function buildLeavePayload(form = {}, { withApplicant = false } = {}) {
  const body = {
    leaveType: form.leaveType,
    fromDate: form.fromDate,
    toDate: form.toDate,
    reason: String(form.reason ?? '').trim(),
  };
  if (withApplicant) {
    body.applicantType = form.applicantType;
    if (form.applicantType === 'student') body.studentId = form.studentId;
    else body.staffId = form.staffId;
    if (form.approve) body.approve = true;
  }
  return body;
}

/** Pending requests first; otherwise keeps the server order (newest first). */
export function sortPendingFirst(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return [
    ...list.filter((r) => r?.status === 'pending'),
    ...list.filter((r) => r?.status !== 'pending'),
  ];
}

/** Counts per status, e.g. `{ pending: 2, approved: 1, rejected: 0, cancelled: 0 }`. */
export function countByStatus(rows) {
  const out = Object.fromEntries(LEAVE_STATUSES.map((s) => [s, 0]));
  for (const r of Array.isArray(rows) ? rows : []) {
    if (out[r?.status] != null) out[r.status] += 1;
  }
  return out;
}

/** Display order for balance rows: quota types first, unpaid last. */
export function sortBalanceRows(rows) {
  const order = ['casual', 'sick', 'annual', 'other', 'unpaid'];
  const rank = (t) => {
    const i = order.indexOf(t);
    return i === -1 ? order.length : i;
  };
  return [...(Array.isArray(rows) ? rows : [])].sort(
    (a, b) => rank(a?.leaveType) - rank(b?.leaveType),
  );
}

export const canCancelOwnLeave = (req) => req?.status === 'pending';
export const canDecideLeave = (req) => req?.status === 'pending';
export const canCancelLeave = (req) => req?.status === 'pending' || req?.status === 'approved';

/** An attendance row written by an approved leave request. */
export const isOnLeave = (attendance) =>
  attendance?.status === 'leave' && !!attendance?.leaveRequestId;

/** `warnings: string[]` from an approve/create response envelope (any nesting). */
export function extractWarnings(res) {
  const w = res?.warnings ?? res?.data?.warnings;
  return Array.isArray(w) ? w.filter((x) => typeof x === 'string' && x) : [];
}

/** '2026-10-09' or '2026-10-09 → 2026-10-11'. */
export function formatLeaveRange(from, to) {
  const a = ymdOf(from);
  const b = ymdOf(to);
  if (!a) return b;
  if (!b || a === b) return a;
  return `${a} → ${b}`;
}

/** Applicant display line, e.g. 'Teacher' or 'Class 5 · A · #A-12'. */
export function applicantMeta(applicant) {
  if (!applicant) return '';
  if (applicant.kind === 'student') {
    return [
      applicant.className,
      applicant.sectionName,
      applicant.admissionNumber ? `#${applicant.admissionNumber}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return applicant.designation || '';
}

export const titleCase = (s) =>
  String(s || '')
    .split(/[-_ ]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
