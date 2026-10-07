// Attachment URLs come from user-supplied data. Only plain https links are
// handed to the OS: `javascript:`, `file:`, `intent:`, `tel:`, custom app
// schemes and cleartext http are refused.

/** True when `url` is an absolute https:// URL with a host. */
export function isSafeUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  // No whitespace/control characters anywhere: they can hide a scheme.
  if (!trimmed || /[\s\u0000-\u001f\u007f]/.test(trimmed)) return false;
  return /^https:\/\/[^/?#@\\]+(?:[/?#]|$)/i.test(trimmed);
}
