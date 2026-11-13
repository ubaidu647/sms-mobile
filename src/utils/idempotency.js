// One key per opened payment form, reused on every retry of that submission so
// the server can recognise a replay instead of recording the payment twice.
// expo-crypto isn't a dependency; use the global crypto when Hermes exposes it.
export function newIdempotencyKey() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    const arr = c.getRandomValues(new Uint8Array(16));
    for (let i = 0; i < 16; i++) bytes[i] = arr[i];
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const idempotencyHeaders = (key) =>
  key ? { headers: { 'Idempotency-Key': key } } : undefined;

// A payment whose outcome is unknown may have committed, so its key outlives the
// form: the next open for the same target ('voucher:<id>', 'student:<id>' or
// 'payslip:<id>') reuses it and the server replays instead of paying twice.
// Memory only, and kept across sign-out: losing it is what risks a double payment.
const heldKeys = new Map();

// No HTTP status (timeout, dropped connection) or a 5xx: it may have gone through.
export const isOutcomeUnknown = (err) => {
  const status = err?.response?.status;
  return status == null || status >= 500;
};

// The server's text is the only signal: other 409s (a write conflict, a payslip
// changed meanwhile) rolled back and leave the key unused.
const SPENT_KEY_MESSAGES = [
  [
    /Idempotency-Key/i,
    'An earlier attempt at this payment went through with a different amount. Check the updated balance before paying again.',
  ],
  [/was voided/i, 'The earlier attempt was voided. Submit again to record a new payment.'],
  [/was reversed/i, 'The earlier attempt was reversed. Submit again to record a new payment.'],
];

const spentKeyMessage = (err) => {
  if (err?.response?.status !== 409) return null;
  const message = String(err.response.data?.message ?? '');
  return SPENT_KEY_MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? null;
};

// The server has this key on record against something else: resubmitting it can
// never succeed, and the payment it did record means the balance on screen is stale.
export const isSpentKeyError = (err) => spentKeyMessage(err) != null;

export const paymentErrorMessage = (err, fallback = 'Failed') =>
  spentKeyMessage(err) || err?.response?.data?.message || err?.message || fallback;

// The API words a replayed payslip payment in terms of the header.
export const paymentSuccessMessage = (message, fallback) =>
  /Idempotency-Key/i.test(message ?? '') ? 'Payment already recorded' : message || fallback;

/** The key a form opening for `target` starts with. */
export const paymentKeyFor = (target) => heldKeys.get(target) ?? newIdempotencyKey();

/**
 * Settles `key` after a submit, returning the key for the next one. `err` is
 * omitted on success. A held key stays held until success or a spent-key conflict.
 */
export function nextPaymentKey(target, key, err) {
  if (!err || isSpentKeyError(err)) {
    heldKeys.delete(target);
    return newIdempotencyKey();
  }
  if (isOutcomeUnknown(err)) heldKeys.set(target, key);
  return key;
}
