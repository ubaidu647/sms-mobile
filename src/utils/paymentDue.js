// Helpers for a subscription's payment window ("block when unpaid"). The
// backend (sms-backend/src/modules/subscription) is authoritative: once
// `paymentDueAt` passes with the invoice still unpaid the school turns
// read-only (state `unpaid`) until the invoice is marked paid.

export const PAYMENT_DUE_MIN = 1;
export const PAYMENT_DUE_MAX = 365;
export const PAYMENT_DUE_DEFAULT = 15;

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Turns the form's "Block when unpaid" switch + days field into the request
 * fields. Returns { error } or { fields } to spread into the payload:
 *   switch off           → { paymentDueInDays: null }  (never block)
 *   switch on, blank     → {}  (key omitted: server carries the previous value / default)
 *   switch on, a number  → { paymentDueInDays: n }
 * `carriedOff` says the value the server would carry is "off" (previous plan
 * had blocking off), so a blank field with the switch on would silently keep
 * it off — a number is required then.
 */
export const paymentDueFields = ({ enabled, raw, carriedOff = false }) => {
  if (!enabled) return { fields: { paymentDueInDays: null } };
  const text = raw == null ? '' : String(raw).trim();
  if (text === '') {
    return carriedOff ? { error: 'required' } : { fields: {} };
  }
  const n = Number(text);
  if (!/^\d+$/.test(text) || !Number.isInteger(n) || n < PAYMENT_DUE_MIN || n > PAYMENT_DUE_MAX) {
    return { error: 'range' };
  }
  return { fields: { paymentDueInDays: n } };
};

/** The form's initial switch state for a plan being changed or renewed. */
export const initialBlockEnabled = (sub) => sub?.paymentDueInDays !== null;

/**
 * The payment window as stored on a subscription:
 *   { kind: 'off' } | { kind: 'days', days } | { kind: 'default' } (older rows without the field)
 */
export const paymentWindow = (sub) => {
  const v = sub?.paymentDueInDays;
  if (v === null) return { kind: 'off' };
  if (Number.isInteger(v) && v > 0) return { kind: 'days', days: v };
  return { kind: 'default' };
};

/** An active subscription whose invoice is past its due date (writes blocked). */
export const isPaymentOverdue = (sub, nowMs = Date.now()) => {
  if (!sub || sub.status !== 'active') return false;
  const due = toDate(sub.paymentDueAt);
  return !!due && due.getTime() < nowMs;
};

