// Upload storage: what a school has used against its plan's limit, and the
// API's refusal when an upload would go past it. Mirrors
// sms-backend/src/shared/storage.ts (1 GB = 1024³ bytes). Pure — covered by
// storageUsage.test.mjs.

export const BYTES_PER_GB = 1024 ** 3;
export const STORAGE_LIMIT_REACHED = 'STORAGE_LIMIT_REACHED';
/** Share of the limit at which the billing screen warns. */
export const STORAGE_WARN_RATIO = 0.9;

export const STORAGE_FULL_FALLBACK =
  'Storage full. Delete old files or ask for more storage.';

/** "1.2 GB" / "350 MB", like the server's messages. */
export function formatBytes(bytes) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n >= BYTES_PER_GB) return `${(n / BYTES_PER_GB).toFixed(2).replace(/\.?0+$/, '')} GB`;
  return `${Math.round(n / 1024 ** 2)} MB`;
}

/**
 * Usage from the current-subscription read's `storage: { usedBytes, limitGB }`:
 * { usedBytes, limitGB, ratio, percent, warn, full } — `limitGB` null means
 * unlimited (ratio null, never warns). null when the API sent no storage.
 */
export function storageUsage(storage) {
  if (!storage || typeof storage !== 'object') return null;
  const usedBytes = Math.max(0, Number(storage.usedBytes) || 0);
  const limitGB = typeof storage.limitGB === 'number' ? storage.limitGB : null;
  if (limitGB === null) {
    return { usedBytes, limitGB, ratio: null, percent: null, warn: false, full: false };
  }
  const limitBytes = limitGB * BYTES_PER_GB;
  const ratio = limitBytes > 0 ? usedBytes / limitBytes : usedBytes > 0 ? 1 : 0;
  return {
    usedBytes,
    limitGB,
    ratio,
    // The bar's fill, capped at 100.
    percent: Math.min(100, Math.round(ratio * 100)),
    warn: ratio >= STORAGE_WARN_RATIO,
    full: ratio >= 1,
  };
}

/** True when the API refused an upload because the school's storage is full. */
export function isStorageLimitError(err) {
  const status = err?.response?.status ?? err?.status;
  const code = err?.response?.data?.code ?? err?.code;
  return status === 403 && code === STORAGE_LIMIT_REACHED;
}

/** The server's "Storage full: …" message, or a fallback; null for other errors. */
export function storageLimitMessage(err) {
  if (!isStorageLimitError(err)) return null;
  const text = err?.response?.data?.message;
  return typeof text === 'string' && text.trim() ? text.trim() : STORAGE_FULL_FALLBACK;
}

// ── Package form ──

/** Package form field for `limits.storageGB`: '' = unlimited. */
export const storageLimitToForm = (limits) =>
  typeof limits?.storageGB === 'number' ? String(limits.storageGB) : '';

/** `limits.storageGB` from the form: blank → null (unlimited), else a number >= 0; undefined when invalid. */
export const storageLimitPayload = (raw) => {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
