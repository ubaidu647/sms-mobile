import axios from 'axios';
import { useTokenStore } from '../store/tokenStore';
import { BACKEND_URL } from '../config/env';
import { clearSessionAndRedirect, getSessionGeneration } from './session';

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((c) => {
  const t = useTokenStore.getState().accessToken;
  if (t) c.headers.Authorization = `Bearer ${t}`;
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
      .post(`${BACKEND_URL}/auth/refresh`, { refreshToken })
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
