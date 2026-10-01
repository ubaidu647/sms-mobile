// School-admin self-serve billing reads (mirror of web src/services/billing.js,
// /me routes only). schoolId is taken from the token — never sent. These are
// READ-ONLY: a school admin can view its own subscription + invoices but cannot
// assign/change/renew or mark invoices paid (those stay super-admin only).
import apiClient from './apiClient';

const unwrap = (res) => res.data; // backend envelope: { status, message, data, total }

const normalizeError = (error) => {
  throw new Error(error.response?.data?.message || error.message || 'Request failed');
};

// Current active subscription for the logged-in school. 404 → no active sub.
export const getMyCurrentSubscription = async () => {
  try {
    const res = await apiClient.get('/subscription/me/current');
    return unwrap(res);
  } catch (error) {
    if (error.response?.status === 404) return { data: null };
    normalizeError(error);
  }
};

// Lightweight subscription STATE for the logged-in school — readable by ANY
// signed-in tenant user (no 'view-billing' needed), so the global guard works
// for every staff role. Returns { state, hardBlockAt, endDate, graceEndsAt?,
// packageName }. Errors keep the HTTP status on `error.status` so the guard can
// skip retries for 4xx.
export const getMySubscriptionStatus = async () => {
  try {
    const res = await apiClient.get('/subscription/me/status');
    return unwrap(res);
  } catch (error) {
    const err = new Error(error.response?.data?.message || error.message || 'Request failed');
    err.status = error.response?.status;
    throw err;
  }
};

// Full subscription history for the logged-in school, newest-first.
export const getMySubscriptionHistory = async () => {
  try {
    const res = await apiClient.get('/subscription/me');
    return unwrap(res); // { data: Subscription[], total }
  } catch (error) {
    normalizeError(error);
  }
};

// Aggregate dues for the logged-in school. A 404 (no invoices) resolves to null.
export const getMyInvoiceSummary = async () => {
  try {
    const res = await apiClient.get('/invoice/me/summary');
    return unwrap(res);
  } catch (error) {
    if (error.response?.status === 404) return { data: null };
    normalizeError(error);
  }
};

// All invoices for the logged-in school, newest-first.
export const listMyInvoices = async () => {
  try {
    const res = await apiClient.get('/invoice/me');
    return unwrap(res); // { data: Invoice[], total }
  } catch (error) {
    normalizeError(error);
  }
};
