// Super-admin system service — schools (organizations), packages, subscriptions,
// invoices. Mirrors the web src/services/billing.js super-admin contract.
// Auth is attached by the apiClient request interceptor; errors are normalised to
// Error(message) so mutation callers can surface err.message directly.
import apiClient from './apiClient';
import { fetchData } from './api';

const unwrap = (res) => res.data; // envelope: { status, message, data, total }
const normalizeError = (error) => {
  throw new Error(error.response?.data?.message || error.message || 'Request failed');
};
const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  );

/* ----------------------------- Organizations ---------------------------- */

export const listSchools = ({ page = 1, limit = 200 } = {}) =>
  fetchData({ url: '/schools', page, limit }); // { data: School[], total }

export const createSchool = async (payload) => {
  try {
    const res = await apiClient.post('/schools', payload);
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

export const toggleSchoolStatus = async ({ id, isActive }) => {
  try {
    const res = await apiClient.patch(`/schools/${id}/status`, { isActive });
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

/* ------------------------------- Packages ------------------------------- */

export const listPackages = async ({ page = 1, limit = 20, isActive, search } = {}) => {
  try {
    const res = await apiClient.get('/package/list', {
      params: cleanParams({ page, limit, isActive, search }),
    });
    return unwrap(res); // { data: Package[], total }
  } catch (error) {
    normalizeError(error);
  }
};

export const createPackage = async (payload) => {
  try {
    const res = await apiClient.post('/package/create', payload);
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

// PATCH accepts any subset of create fields. When `limits` is included it must
// carry all four numbers (the backend treats it as a whole object).
export const updatePackage = async (id, payload) => {
  try {
    const res = await apiClient.patch(`/package/${id}`, payload);
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

// Soft delete — sets isActive:false, never hard-deletes.
export const deletePackage = async (id) => {
  try {
    const res = await apiClient.delete(`/package/${id}`);
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

/* ----------------------------- Subscriptions ---------------------------- */

// 404 → "no active subscription" rather than a hard failure.
export const getCurrentSubscription = async (schoolId) => {
  try {
    const res = await apiClient.get(`/subscription/school/${schoolId}/current`);
    return unwrap(res);
  } catch (error) {
    if (error.response?.status === 404) return { data: null };
    normalizeError(error);
  }
};

export const getSubscriptionHistory = async (schoolId) => {
  try {
    const res = await apiClient.get(`/subscription/school/${schoolId}`);
    return unwrap(res); // { data: Subscription[], total }
  } catch (error) {
    normalizeError(error);
  }
};

// Assign a plan to a school with NO active subscription.
// payload: { schoolId, packageId, customLimits?, paymentInfo?, gracePeriodInDays? }
export const assignSubscription = async (payload) => {
  try {
    const res = await apiClient.post('/subscription/assign', payload);
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

// Upgrade/downgrade — direction auto-detected by price. Fresh full cycle.
export const changePackage = async (payload) => {
  try {
    const res = await apiClient.post('/subscription/change', payload);
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

// Renew same package, fresh cycle, re-snapshots current catalog pricing.
// `keepAddons` (default true) carries the add-ons over, billed for the full period.
export const renewSubscription = async (payload) => {
  try {
    const res = await apiClient.post('/subscription/renew', payload);
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

/* -------------------------------- Add-ons ------------------------------- */
// Extra units of a plan limit bought mid-period, billed for the days left on
// an `addon` invoice. body: { schoolId, resource, quantity, unitPrice? }.

// Price without buying. 400 (with a message) when no unit price is listed and
// none is given, or the plan period has ended.
export const quoteAddon = async (payload) => {
  try {
    const res = await apiClient.post('/subscription/addon/quote', payload);
    return unwrap(res); // data: { unitPrice, amount, remainingDays, currentLimit, newLimit, ... }
  } catch (error) {
    normalizeError(error);
  }
};

// Buy: raises the limit at once. body may add paymentInfo.
export const purchaseAddon = async (payload) => {
  try {
    const res = await apiClient.post('/subscription/addon', payload);
    return unwrap(res); // data: { addon, quote, invoiceId, amountDue }
  } catch (error) {
    normalizeError(error);
  }
};

// Remove an add-on whose invoice is unpaid (voids it). 400 once paid.
export const removeAddon = async ({ schoolId, addonId }) => {
  try {
    const res = await apiClient.post('/subscription/addon/remove', { schoolId, addonId });
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

export const cancelSubscription = async (schoolId) => {
  try {
    const res = await apiClient.post('/subscription/cancel', { schoolId });
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};

/* ------------------------------- Invoices ------------------------------- */

export const listInvoices = async (schoolId) => {
  try {
    const res = await apiClient.get(`/invoice/school/${schoolId}`);
    return unwrap(res); // { data: Invoice[], total }
  } catch (error) {
    normalizeError(error);
  }
};

export const getInvoiceSummary = async (schoolId) => {
  try {
    const res = await apiClient.get(`/invoice/school/${schoolId}/summary`);
    return unwrap(res);
  } catch (error) {
    if (error.response?.status === 404) return { data: null };
    normalizeError(error);
  }
};

// The invoice tied to a single subscription. 404 → no invoice.
export const getInvoiceBySubscription = async (subscriptionId) => {
  try {
    const res = await apiClient.get(`/invoice/subscription/${subscriptionId}`);
    return unwrap(res);
  } catch (error) {
    if (error.response?.status === 404) return { data: null };
    normalizeError(error);
  }
};

// Mark an invoice paid — clears it from outstanding dues.
export const markInvoicePaid = async (id, paymentInfo) => {
  try {
    const res = await apiClient.patch(`/invoice/${id}/pay`, paymentInfo ? { paymentInfo } : {});
    return unwrap(res);
  } catch (error) {
    normalizeError(error);
  }
};
