import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {
  getCurrentSubscription,
  getSubscriptionHistory,
  assignSubscription,
  changePackage,
  renewSubscription,
  cancelSubscription,
  quoteAddon,
  purchaseAddon,
  removeAddon,
  listInvoices,
  getInvoiceSummary,
  getInvoiceBySubscription,
  markInvoicePaid,
} from '../services/system';

export const useCurrentSubscription = (schoolId) =>
  useQuery({
    queryKey: ['subscription', 'current', schoolId],
    queryFn: () => getCurrentSubscription(schoolId),
    enabled: !!schoolId,
  });

export const useSubscriptionHistory = (schoolId) =>
  useQuery({
    queryKey: ['subscription', 'history', schoolId],
    queryFn: () => getSubscriptionHistory(schoolId),
    enabled: !!schoolId,
  });

// Every subscription action re-reads the school's current + history + invoices.
const useSubscriptionMutation = (mutationFn, successMsg, onDone) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (res, vars) => {
      const schoolId = typeof vars === 'string' ? vars : vars?.schoolId;
      Toast.show({ type: 'success', text1: res?.message || successMsg });
      if (schoolId) {
        queryClient.invalidateQueries({ queryKey: ['subscription', 'current', schoolId] });
        queryClient.invalidateQueries({ queryKey: ['subscription', 'history', schoolId] });
        queryClient.invalidateQueries({ queryKey: ['invoice', 'list', schoolId] });
        queryClient.invalidateQueries({ queryKey: ['invoice', 'summary', schoolId] });
      }
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      onDone?.(res?.data);
    },
    onError: (err) => Toast.show({ type: 'error', text1: 'Action failed', text2: err.message }),
  });
};

export const useAssignSubscription = (opts = {}) =>
  useSubscriptionMutation((p) => assignSubscription(p), 'Subscription assigned', opts.onSuccess);

export const useChangePackage = (opts = {}) =>
  useSubscriptionMutation((p) => changePackage(p), 'Plan changed', opts.onSuccess);

export const useRenewSubscription = (opts = {}) =>
  useSubscriptionMutation((p) => renewSubscription(p), 'Subscription renewed', opts.onSuccess);

/* -------------------------------- Add-ons ------------------------------- */

// Live price for the add-on form. `payload` is null until the form is valid;
// callers debounce it so typing does not fire a request per keystroke.
export const useAddonQuote = (payload) =>
  useQuery({
    queryKey: ['subscription', 'addonQuote', payload],
    queryFn: () => quoteAddon(payload),
    enabled: !!payload?.schoolId,
    retry: false,
  });

export const usePurchaseAddon = (opts = {}) =>
  useSubscriptionMutation((p) => purchaseAddon(p), 'Add-on added', opts.onSuccess);

// No global error toast: callers show the server's message (e.g. "already paid").
export const useRemoveAddon = (opts = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p) => removeAddon(p),
    onSuccess: (res, vars) => {
      Toast.show({ type: 'success', text1: res?.message || 'Add-on removed' });
      const schoolId = vars?.schoolId;
      if (schoolId) {
        queryClient.invalidateQueries({ queryKey: ['subscription', 'current', schoolId] });
        queryClient.invalidateQueries({ queryKey: ['subscription', 'history', schoolId] });
        queryClient.invalidateQueries({ queryKey: ['invoice', 'list', schoolId] });
        queryClient.invalidateQueries({ queryKey: ['invoice', 'summary', schoolId] });
      }
      opts.onSuccess?.(res?.data);
    },
  });
};

export const useCancelSubscription = (opts = {}) =>
  useSubscriptionMutation(
    (schoolId) => cancelSubscription(schoolId),
    'Subscription cancelled',
    opts.onSuccess,
  );

/* ------------------------------- Invoices ------------------------------- */

export const useInvoiceSummary = (schoolId) =>
  useQuery({
    queryKey: ['invoice', 'summary', schoolId],
    queryFn: () => getInvoiceSummary(schoolId),
    enabled: !!schoolId,
  });

// Every invoice of a school (newest first, up to the server's page size) —
// used to tell which add-ons are paid.
export const useSchoolInvoices = (schoolId, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['invoice', 'list', schoolId],
    queryFn: () => listInvoices(schoolId),
    enabled: !!schoolId && enabled,
  });

export const useInvoiceBySubscription = (subscriptionId) =>
  useQuery({
    queryKey: ['invoice', 'subscription', subscriptionId],
    queryFn: () => getInvoiceBySubscription(subscriptionId),
    enabled: !!subscriptionId,
  });

export const useMarkInvoicePaid = (schoolId, { onSuccess } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentInfo }) => markInvoicePaid(id, paymentInfo),
    onSuccess: (res) => {
      Toast.show({ type: 'success', text1: res?.message || 'Invoice marked paid' });
      if (schoolId) {
        queryClient.invalidateQueries({ queryKey: ['invoice', 'list', schoolId] });
        queryClient.invalidateQueries({ queryKey: ['invoice', 'summary', schoolId] });
        // Paying clears the plan's payment due date (and lifts an `unpaid` block).
        queryClient.invalidateQueries({ queryKey: ['subscription', 'current', schoolId] });
        queryClient.invalidateQueries({ queryKey: ['subscription', 'history', schoolId] });
      }
      queryClient.invalidateQueries({ queryKey: ['invoice', 'subscription'] });
      onSuccess?.(res?.data);
    },
    onError: (err) =>
      Toast.show({ type: 'error', text1: 'Failed', text2: err.message || 'Update failed' }),
  });
};

// Re-export so screens can also pull the invoice list if needed.
export { listInvoices };
