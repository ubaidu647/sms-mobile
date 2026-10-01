// Client-side mirror of the backend's evaluateSubscription
// (sms-backend/src/modules/subscription/subscription.enforcement.ts). The backend
// remains authoritative — it still blocks writes once past grace — but this lets
// the UI show the grace/blocked state without a response header.
//
// States:
//   active   — within the paid period; full access, no warning
//   grace    — past endDate but within the grace window; warn, still allowed
//   expired  — past endDate + grace; hard-blocked
//   cancelled— explicitly cancelled; hard-blocked
//   none     — no live subscription on record; hard-blocked

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    return { state: 'expired', hardBlockAt, endDate };
  }
  if (nowMs > endMs) return { state: 'grace', hardBlockAt, endDate };
  return { state: 'active', hardBlockAt, endDate };
};

// Normalises the server-computed GET /subscription/me/status payload into the
// guard's shape. The server already evaluated the state; we only re-derive the
// active→grace→expired transitions from its dates so a long-open session crosses
// over without waiting for the next poll. Anything unrecognised → null (unknown,
// fail-open).
const KNOWN_STATES = ['active', 'grace', 'expired', 'cancelled', 'none'];

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const fromStatusResponse = (status, nowMs = Date.now()) => {
  if (!status || !KNOWN_STATES.includes(status.state)) {
    return { state: null, endDate: null, hardBlockAt: null, packageName: null };
  }
  const endDate = toDate(status.endDate);
  const hardBlockAt = toDate(status.hardBlockAt) || toDate(status.graceEndsAt);
  let { state } = status;
  if (state === 'active' || state === 'grace') {
    if (hardBlockAt && nowMs > hardBlockAt.getTime()) state = 'expired';
    else if (state === 'active' && endDate && nowMs > endDate.getTime()) state = 'grace';
  }
  return { state, endDate, hardBlockAt, packageName: status.packageName ?? null };
};

// States where the whole app should be hard-blocked.
export const isBlockedState = (state) =>
  state === 'expired' || state === 'cancelled' || state === 'none';
