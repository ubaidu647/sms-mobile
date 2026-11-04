// Pure helpers for the Change password screen (no React Native imports, so
// they run under `node --test`).
//
// The length rule mirrors the backend's POST /auth/change-password: a new
// password is 8..128 characters and must differ from the current one. The
// server is still the authority; this only saves a round trip.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/**
 * Field errors for the form, keyed by field name. An empty object means the
 * form may be submitted.
 */
export function validateChangePassword({ currentPassword, newPassword, confirmPassword } = {}) {
  const errors = {};
  const current = typeof currentPassword === 'string' ? currentPassword : '';
  const next = typeof newPassword === 'string' ? newPassword : '';
  const confirm = typeof confirmPassword === 'string' ? confirmPassword : '';

  if (!current) errors.currentPassword = 'Enter your current password';

  if (!next) errors.newPassword = 'Enter a new password';
  else if (next.length < PASSWORD_MIN) {
    errors.newPassword = `Password must be at least ${PASSWORD_MIN} characters`;
  } else if (next.length > PASSWORD_MAX) {
    errors.newPassword = `Password must be at most ${PASSWORD_MAX} characters`;
  } else if (current && next === current) {
    errors.newPassword = 'New password must be different from your current password';
  }

  if (!confirm) errors.confirmPassword = 'Confirm your new password';
  else if (next && confirm !== next) errors.confirmPassword = 'Passwords do not match';

  return errors;
}

/**
 * The fresh session the server hands back after a change. Every earlier
 * session (this device's included) was revoked, so without both tokens the
 * app cannot stay signed in. Returns null when either is missing.
 */
export function tokensFromChangeResponse(body) {
  const data = body?.data ?? null;
  const accessToken = data?.accessToken ?? data?.token;
  const refreshToken = data?.refreshToken;
  if (typeof accessToken !== 'string' || !accessToken) return null;
  if (typeof refreshToken !== 'string' || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/** A human message for a failed request: the server's, else a fallback. */
export function changePasswordErrorMessage(err) {
  const serverMessage = err?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage) return serverMessage;
  if (!err?.response) return 'You appear to be offline. Please try again.';
  return 'Could not change your password. Please try again.';
}
