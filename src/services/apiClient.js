import axios from 'axios';
import { useTokenStore } from '../store/tokenStore';
import { BACKEND_URL } from '../config/env';
import { clearSessionAndRedirect } from './session';

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
// A network error, 5xx or 429 is transient: keep the tokens and let the caller
// see the failure.
const isSessionDead = (err) => {
  const s = err?.response?.status;
  return s === 401 || s === 403;
};

// One refresh in flight at a time; concurrent 401s await the same promise.
let refreshPromise = null;

function refreshTokens() {
  if (!refreshPromise) {
    const { refreshToken } = useTokenStore.getState();
    refreshPromise = axios
      .post(`${BACKEND_URL}/auth/refresh`, { refreshToken })
      .then((res) => {
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
        refreshPromise = null;
      });
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

    let accessToken;
    try {
      accessToken = await refreshTokens();
    } catch (refreshError) {
      if (isSessionDead(refreshError)) clearSessionAndRedirect();
      // Reject (never resolve null): every waiting caller gets a real error.
      return Promise.reject(error);
    }
    if (orig.headers) orig.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient(orig);
  },
);

export default apiClient;
