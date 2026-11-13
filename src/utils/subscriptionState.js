// Client-side mirror of the backend's evaluateSubscription
// (sms-backend/src/modules/subscription/subscription.enforcement.ts). The backend
// remains authoritative — it still blocks writes once past grace — but this lets
// the UI show the grace/blocked state without a response header.
//
// States:
//   active   — within the paid period; full access, no warning
//   grace    — past endDate but within the grace window; warn, still allowed
//   expired  — past endDate + grace; hard-blocked
//   unpaid   — within the period, but its invoice is past `paymentDueAt`;
//              read-only until the super-admin marks the invoice paid
//   cancelled— explicitly cancelled; hard-blocked
//   none     — no live subscription on record; hard-blocked

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const evaluateSubscription = (sub, nowMs = Date.now()) => {
  if (!sub) return { state: 'none', hardBlockAt: null, endDate: null };
  if (sub.status === 'cancelled') return { state: 'cancelled', hardBlockAt: null, endDate: null };

  const endDate = sub.endDate ? new Date(sub.endDate) : null;
  if (!endDate || Number.isNaN(endDate.getTime())) {
    return { state: 'none', hardBlockAt: null, endDate: null };
  }

  const endMs = endDate.getTime();
  const graceDays = Math.max(0, Number(sub.gracePeriodInDays) || 0);
  const hardBlockAt = new Date(endMs + graceDays * MS_PER_DAY);

  if (sub.status === 'expired' || nowMs > hardBlockAt.getTime()) {
    return { state: 'expired', hardBlockAt, endDate, paymentDueAt: null };
  }
  const paymentDueAt = toDate(sub.paymentDueAt);
  if (paymentDueAt && nowMs > paymentDueAt.getTime()) {
    return { state: 'unpaid', hardBlockAt, endDate, paymentDueAt };
  }
  if (nowMs > endMs) return { state: 'grace', hardBlockAt, endDate, paymentDueAt };
  return { state: 'active', hardBlockAt, endDate, paymentDueAt };
};

// Normalises the server-computed GET /subscription/me/status payload into the
// guard's shape. The server already evaluated the state; we only re-derive the
// active→grace→expired (and →unpaid) transitions from its dates so a long-open session crosses
// over without waiting for the next poll. Anything unrecognised → null (unknown,
// fail-open).
const KNOWN_STATES = ['active', 'grace', 'expired', 'cancelled', 'unpaid', 'none'];

export const fromStatusResponse = (status, nowMs = Date.now()) => {
  if (!status || !KNOWN_STATES.includes(status.state)) {
    return { state: null, endDate: null, hardBlockAt: null, paymentDueAt: null, packageName: null };
  }
  const endDate = toDate(status.endDate);
  const hardBlockAt = toDate(status.hardBlockAt) || toDate(status.graceEndsAt);
  const paymentDueAt = toDate(status.paymentDueAt);
  let { state } = status;
  if (state === 'active' || state === 'grace' || state === 'unpaid') {
    // Same order as the server: expiry first, then the overdue invoice.
    if (hardBlockAt && nowMs > hardBlockAt.getTime()) state = 'expired';
    else if (paymentDueAt && nowMs > paymentDueAt.getTime()) state = 'unpaid';
    else if (state === 'active' && endDate && nowMs > endDate.getTime()) state = 'grace';
  }
  return { state, endDate, hardBlockAt, paymentDueAt, packageName: status.packageName ?? null };
};

// States where the whole app should be hard-blocked (read-only on the server).
export const isBlockedState = (state) =>
  state === 'expired' || state === 'cancelled' || state === 'unpaid' || state === 'none';

// Warn the school this many days before an unpaid invoice blocks writes.
export const PAYMENT_WARN_DAYS = 7;

// True while an owed invoice's due date is ahead but within PAYMENT_WARN_DAYS,
// on a school that is otherwise usable (active or grace).
export const paymentDueSoon = (guard, nowMs = Date.now()) => {
  if (!guard || (guard.state !== 'active' && guard.state !== 'grace')) return false;
  const due = toDate(guard.paymentDueAt);
  if (!due) return false;
  const left = due.getTime() - nowMs;
  return left >= 0 && left <= PAYMENT_WARN_DAYS * MS_PER_DAY;
};

// The billing screen stays open to a blocked school: the API still serves its
// reads, and the school needs them to see what to renew. Writes stay refused
// by the backend. `segments` comes from expo-router's useSegments.
export const isBillingRoute = (segments) => segments?.[segments.length - 1] === 'billing';

export const coversScreen = (state, segments) =>
  isBlockedState(state) && !isBillingRoute(segments);
