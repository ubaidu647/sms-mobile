// Session-level refusals the API can send on any request (and on login /
// refresh). Errors carry `message` and, from newer API builds, a `code`; the
// message text is matched only when the code is missing. Pure (no React
// Native imports) — covered by authErrors.test.mjs.

export const PLAN_REFUSAL_CODES = ['PLAN_DASHBOARD_DISABLED', 'PLAN_PLATFORM_DISABLED'];
export const PASSWORD_CHANGE_CODE = 'PASSWORD_CHANGE_REQUIRED';

// Narrow on purpose: a feature-level 403 ("your plan does not include the
// library module") must not end the session.
const PLAN_REFUSAL_TEXT = [
  /does not include this dashboard/i,
  /does not include the (web portal|android app|ios app)/i,
];

export const PLAN_REFUSAL_FALLBACK =
  'Your school’s plan does not include this app. Please contact the school administrator.';

export const FORCED_PASSWORD_BANNER = 'Please set a new password to continue';

function bodyOf(err) {
  const data = err?.response?.data;
  return data && typeof data === 'object' ? data : {};
}

/** The server's message when `err` is a plan refusal (403), else null. */
export function planRefusalMessage(err) {
  if (err?.response?.status !== 403) return null;
  const { code, message } = bodyOf(err);
  const text = typeof message === 'string' ? message.trim() : '';
  if (PLAN_REFUSAL_CODES.includes(code)) return text || PLAN_REFUSAL_FALLBACK;
  if (!code && text && PLAN_REFUSAL_TEXT.some((re) => re.test(text))) return text;
  return null;
}

/** True when the API refuses the request until the password is changed. */
export function isPasswordChangeRequired(err) {
  return err?.response?.status === 403 && bodyOf(err).code === PASSWORD_CHANGE_CODE;
}

/**
 * `mustChangePassword` from a login or /auth/me payload ({ user, mustChangePassword }
 * or the flag on the user itself); undefined when the API did not say.
 */
export function mustChangePasswordOf(payload) {
  if (!payload || typeof payload !== 'object') return undefined;
  if (typeof payload.mustChangePassword === 'boolean') return payload.mustChangePassword;
  const u = payload.user || payload.userCreated;
  if (u && typeof u.mustChangePassword === 'boolean') return u.mustChangePassword;
  return undefined;
}

/** The user with the payload's `mustChangePassword` recorded on it. */
export function withPasswordFlag(user, payload) {
  if (!user) return user;
  const flag = mustChangePasswordOf(payload);
  return flag === undefined ? user : { ...user, mustChangePassword: flag };
}
