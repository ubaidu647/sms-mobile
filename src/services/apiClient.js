import axios from 'axios';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTokenStore } from '../store/tokenStore';
import { useUserStore } from '../store/userStore';
import { BACKEND_URL } from '../config/env';
import { clearSessionAndRedirect, getSessionGeneration } from './session';
import { CLIENT_PLATFORM_HEADER, clientPlatformValue } from '../utils/clientPlatform';
import { isPasswordChangeRequired, planRefusalMessage } from '../utils/authErrors';
import { isPlanFeatureDisabledError } from '../utils/planFeatures';
import { isStorageLimitError, storageLimitMessage } from '../utils/storageUsage';
import { queryClient } from './queryClient';

// Sent on EVERY request (login and refresh included): the backend refuses a
// school whose plan does not include this platform (e.g. "Your school's plan
// does not include the Android app"). Also used by the raw axios calls below
// and in useAuth (logout), which bypass apiClient.
export const platformHeaders = {
  [CLIENT_PLATFORM_HEADER]: clientPlatformValue(Platform.OS),
};

// A request that hangs must fail into the normal error paths, not spin forever.
const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', ...platformHeaders },
});

apiClient.interceptors.request.use((c) => {
  const t = useTokenStore.getState().accessToken;
  if (t) c.headers.Authorization = `Bearer ${t}`;
  if (c.data instanceof FormData) c.timeout = UPLOAD_TIMEOUT_MS;
  return c;
});

// Endpoints whose 401 means "bad credentials", not "access token expired".
const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/system/login') ||
  url.includes('/auth/refresh');

// Only an explicit rejection of the refresh token (401/403) ends the session.
// A network error, 5xx (the refresh endpoint answers 503 on infra trouble) or
// 429 is transient: keep the tokens and let the caller see a retryable error.
const isSessionDead = (err) => {
  const s = err?.response?.status;
  return s === 401 || s === 403;
};

// Thrown when a refresh outlives the session it was started for (the user
// logged out, or another account logged in, while it was in flight).
const staleSessionError = () => {
  const err = new Error('Session ended while refreshing');
  err.isStaleSession = true;
  return err;
};

// The school's plan no longer covers this dashboard/platform: retrying or
// refreshing cannot help. Revoke the refresh token (logout skips the plan
// gate), end the session like a dead one and say why on the sign-in screen.
// Once per session generation, so a burst of refused requests signs out once.
let planEndedGeneration = -1;
function endSessionForPlan(message) {
  const generation = getSessionGeneration();
  if (planEndedGeneration === generation) return;
  const { accessToken: at, refreshToken: rt } = useTokenStore.getState();
  if (rt) {
    axios
      .post(
        `${BACKEND_URL}/auth/logout`,
        { refreshToken: rt },
        { headers: { ...platformHeaders, ...(at ? { Authorization: `Bearer ${at}` } : {}) } },
      )
      .catch(() => {});
  }
  clearSessionAndRedirect();
  // clearSession bumped the generation; remember the new one.
  planEndedGeneration = getSessionGeneration();
  Toast.show({
    type: 'error',
    text1: 'Signed out',
    text2: message,
    visibilityTime: 8000,
  });
}

// The API refuses everything but change-password until the password is
// changed: record it on the user so the app layout shows that screen.
function flagPasswordChange() {
  const { user, setUser } = useUserStore.getState();
  if (user && !user.mustChangePassword) setUser({ ...user, mustChangePassword: true });
}

// A call into a module the school's plan lacks (403 PLAN_FEATURE_DISABLED).
// Not a session problem: the request just fails, with the server's message
// ("This module is not included in your school's plan…") as `error.message`
// so every existing error toast/state shows it. The plan may have changed
// while the app was open, so the cached plan status is refreshed (at most
// every 30 s) and the menus/screen guards catch up.
const PLAN_STATUS_KEY = ['billing', 'me', 'subscription', 'status'];
let planStatusRefreshedAt = 0;
function notePlanFeatureRefusal(error) {
  const text = error.response?.data?.message;
  if (typeof text === 'string' && text.trim()) error.message = text.trim();
  error.isPlanFeatureDisabled = true;
  const now = Date.now();
  if (now - planStatusRefreshedAt > 30_000) {
    planStatusRefreshedAt = now;
    queryClient.invalidateQueries({ queryKey: PLAN_STATUS_KEY });
  }
}

// An upload refused because the school's storage is full (403
// STORAGE_LIMIT_REACHED, "Storage full: 1.9 GB of 2 GB used. …"). Handled
// once here: the server's message becomes `error.message` (every upload
// screen already toasts `response.data.message || message`), the error is
// flagged, and the cached storage figures are refreshed so the billing screen
// shows the real usage.
const MY_SUBSCRIPTION_KEY = ['billing', 'me', 'subscription', 'current'];
function noteStorageLimit(error) {
  error.message = storageLimitMessage(error);
  error.isStorageLimitReached = true;
  queryClient.invalidateQueries({ queryKey: MY_SUBSCRIPTION_KEY });
}

// One refresh in flight per session generation; concurrent 401s await the
// same promise. A new generation (after logout/login) never joins an old one.
let refreshPromise = null;
let refreshGeneration = -1;

function refreshTokens() {
  const generation = getSessionGeneration();
  if (!refreshPromise || refreshGeneration !== generation) {
    const { refreshToken } = useTokenStore.getState();
    refreshGeneration = generation;
    const p = axios
      .post(
        `${BACKEND_URL}/auth/refresh`,
        { refreshToken },
        { headers: platformHeaders, timeout: REQUEST_TIMEOUT_MS },
      )
      .then((res) => {
        // Logged out (or re-logged in) meanwhile: drop this result entirely so
        // a late response can't write tokens back into a cleared session.
        if (getSessionGeneration() !== generation) throw staleSessionError();
        // Refresh tokens ROTATE: the backend retires the presented token and
        // returns a new one, which must replace it or the next refresh fails.
        const { accessToken, refreshToken: next } = res.data?.data || {};
        if (!accessToken || !next) {
          const err = new Error('Malformed refresh response');
          err.response = { status: 401 };
          throw err;
        }
        useTokenStore.getState().setTokens({ accessToken, refreshToken: next });
        return accessToken;
      })
      .finally(() => {
        if (refreshPromise === p) refreshPromise = null;
      });
    refreshPromise = p;
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config || {};
    const status = error.response?.status;

    // 403 session-level refusals. Login shows its own error; logout must
    // never loop back here.
    const url = orig.url || '';
    if (status === 403 && !isAuthEndpoint(url) && !url.includes('/auth/logout')) {
      const planMessage = planRefusalMessage(error);
      if (planMessage) endSessionForPlan(planMessage);
      else if (isPasswordChangeRequired(error)) flagPasswordChange();
      else if (isPlanFeatureDisabledError(error)) notePlanFeatureRefusal(error);
      else if (isStorageLimitError(error)) noteStorageLimit(error);
      return Promise.reject(error);
    }

    if (status !== 401 || orig._retry || isAuthEndpoint(orig.url)) {
      return Promise.reject(error);
    }
    orig._retry = true;

    if (!useTokenStore.getState().refreshToken) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    const generation = getSessionGeneration();
    let accessToken;
    try {
      accessToken = await refreshTokens();
    } catch (refreshError) {
      // Reject (never resolve null): every waiting caller gets a real error.
      if (refreshError?.isStaleSession || getSessionGeneration() !== generation) {
        // The session this request belonged to is already gone; nothing to do.
        return Promise.reject(error);
      }
      // The plan dropped this dashboard/platform: say why on the way out.
      const planMessage = planRefusalMessage(refreshError);
      if (planMessage) {
        endSessionForPlan(planMessage);
        return Promise.reject(error);
      }
      if (isSessionDead(refreshError)) {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }
      // Transient (offline / 5xx / 503 / 429): keep the session, and hand the
      // caller an error it can recognise as retryable.
      error.isRetryable = true;
      error.isOffline = !refreshError?.response;
      error.refreshError = refreshError;
      error.message = error.isOffline
        ? 'You appear to be offline. Please try again.'
        : 'Service temporarily unavailable. Please try again.';
      return Promise.reject(error);
    }
    // Logged out while the refresh was in flight: don't replay the request.
    if (getSessionGeneration() !== generation) return Promise.reject(error);
    if (orig.headers) orig.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient(orig);
  },
);

export default apiClient;
