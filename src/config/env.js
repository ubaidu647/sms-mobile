// REST base URL — includes the /api prefix the backend mounts every route under.
// (Mobile has no socket client; anything needing the bare origin should strip /api.)

/** Dev-only fallback: the backend's default PORT. Override in .env if yours differs. */
export const DEV_FALLBACK_BACKEND_URL = 'http://localhost:4000/api';

/**
 * Resolve the backend URL, or throw for a release build that would otherwise
 * ship pointing at localhost or talking to the API in the clear.
 *
 * EXPO_PUBLIC_* values are inlined when the bundle is built, so a release
 * build made without the variable would silently call http://localhost on a
 * user's phone — every request failing with a network error and nothing saying
 * why. Failing at startup with this message makes the bad build obvious.
 *
 * QA / staging escape hatch: EXPO_PUBLIC_ALLOW_INSECURE_BACKEND=1 lets a release
 * build talk to a plain http:// backend (a LAN or staging box without TLS),
 * with a loud warning. The variable must still be set and a valid URL. Never
 * set it for a store build.
 *
 * @param {string | undefined} raw - EXPO_PUBLIC_BACKEND_URL as inlined
 * @param {boolean} isDev - __DEV__
 * @param {string | undefined} [allowInsecureRaw] - EXPO_PUBLIC_ALLOW_INSECURE_BACKEND
 * @param {(msg: string) => void} [warn]
 */
export function resolveBackendUrl(raw, isDev, allowInsecureRaw, warn = console.warn) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (isDev) return value || DEV_FALLBACK_BACKEND_URL;

  if (!value) {
    throw new Error(
      'EXPO_PUBLIC_BACKEND_URL is not set for this release build. Set it to the ' +
        'https API base (e.g. https://api.nodecampus.online/api) in .env or the EAS ' +
        'build environment, then rebuild — the value is inlined at build time.',
    );
  }
  // Not `new URL()`: React Native's URL does no validation, so "https:api" or
  // "https://" would pass on the device even though they fail in node.
  const url = parseHttpUrl(value);
  const allowInsecure = isOptIn(allowInsecureRaw);
  if (url && url.protocol === 'http:' && allowInsecure) {
    warn(
      '[env] WARNING: EXPO_PUBLIC_ALLOW_INSECURE_BACKEND is set — this RELEASE build talks ' +
        `to the API over plain http (${value}). Sessions and data travel unencrypted. ` +
        'For QA/staging only; never ship this build to users.',
    );
    return value;
  }
  if (!url || url.protocol !== 'https:') {
    throw new Error(
      `EXPO_PUBLIC_BACKEND_URL must be an https:// URL in a release build (got "${value}"). ` +
        'Release builds never talk to the API in the clear; rebuild with the https API base ' +
        '(or, for a QA/staging build only, set EXPO_PUBLIC_ALLOW_INSECURE_BACKEND=1).',
    );
  }
  return value;
}

// scheme://host[:port][/path][?query][#hash] — host is dotted labels (a domain
// or IPv4) or "localhost"; no credentials, no spaces.
const HTTP_URL_RE =
  /^(https?):\/\/([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*)(?::(\d{1,5}))?(\/[^\s?#]*)?(\?[^\s#]*)?(#\S*)?$/i;

/**
 * Strict http(s) URL check that does not depend on the platform's URL class.
 * @returns {{ protocol: 'http:' | 'https:', host: string, port: number | null } | null}
 */
export function parseHttpUrl(value) {
  if (typeof value !== 'string') return null;
  const m = HTTP_URL_RE.exec(value);
  if (!m) return null;
  const host = m[2].toLowerCase();
  if (host !== 'localhost' && !host.includes('.')) return null;
  let port = null;
  if (m[3] !== undefined) {
    port = Number(m[3]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  }
  return { protocol: `${m[1].toLowerCase()}:`, host, port };
}

/** "1" / "true" (any case) → true; anything else, including unset, → false. */
function isOptIn(raw) {
  return typeof raw === 'string' && /^(1|true)$/i.test(raw.trim());
}

// Referenced literally so Expo inlines them into the bundle.
export const BACKEND_URL = resolveBackendUrl(
  process.env.EXPO_PUBLIC_BACKEND_URL,
  typeof __DEV__ === 'undefined' ? true : __DEV__,
  process.env.EXPO_PUBLIC_ALLOW_INSECURE_BACKEND,
);
