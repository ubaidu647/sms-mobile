import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { extractWarnings } from '../utils/leave';

// Leave Management. Query keys mirror the admin app:
//   ['leave-requests', filters]          management list
//   ['leave-my', params]                 own requests
//   ['leave-balance', 'me'|staffId, yr]  balances

const errMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

// Approve/cancel/create-approved rewrite attendance rows, so every register,
// summary and history the app caches has to refetch.
const ATTENDANCE_KEYS = [
  ['attendance-daily'],
  ['attendance-summary'],
  ['attendance-unmarked'],
  ['attendance-student-history'],
  ['attendance-student-summary'],
  ['staff-attendance-daily'],
  ['staff-attendance-summary'],
  ['staff-attendance-unmarked-branches'],
  ['staff-attendance-history'],
  ['staff-attendance-monthly'],
];

function invalidateLeave(queryClient, { attendance = false } = {}) {
  queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
  queryClient.invalidateQueries({ queryKey: ['leave-my'] });
  queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
  queryClient.invalidateQueries({ queryKey: ['leave-detail'] });
  if (attendance) {
    ATTENDANCE_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  }
}

// Payslip warnings (draft needs regenerating / finalized not reflected) can be
// long and several, more than a toast shows, so they get a dismissable alert.
function showWarnings(res) {
  const warnings = extractWarnings(res);
  if (!warnings.length) return;
  Alert.alert(
    warnings.length === 1 ? 'Please note' : `${warnings.length} things to note`,
    warnings.join('\n\n'),
  );
}

// ───────── Own (apply-own-leave) ─────────

export function useMyLeaveRequests({ status, page = 1, limit = 20, enabled = true } = {}) {
  const params = clean({ status, page, limit });
  return useQuery({
    queryKey: ['leave-my', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave/my', { params });
      return data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useMyLeaveBalance({ leaveYear, enabled = true } = {}) {
  return useQuery({
    queryKey: ['leave-balance', 'me', leaveYear || ''],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave/my/balance', {
        params: clean({ leaveYear }),
      });
      return data?.data ?? null;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useApplyLeave({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/leave/my', payload);
      return data;
    },
    onSuccess: (res) => {
      invalidateLeave(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Leave request submitted' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Could not apply', text2: errMsg(err, 'Request failed') });
    },
  });
}

export function useCancelMyLeave({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch(`/leave/my/${id}/cancel`);
      return data;
    },
    onSuccess: (res) => {
      invalidateLeave(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Leave request cancelled' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Cancel failed', text2: errMsg(err, 'Request failed') });
    },
  });
}

// ───────── Management (view-leave / approve-leave) ─────────

/**
 * filters: { applicantType, status, branchId, from, to, staffId, studentId,
 * classId, sectionId, page, limit }
 */
export function useLeaveRequests(filters = {}, { enabled = true } = {}) {
  const params = clean(filters);
  return useQuery({
    queryKey: ['leave-requests', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave', { params });
      return data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useLeaveDetail(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['leave-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/leave/${id}`);
      return data?.data ?? null;
    },
    enabled: enabled && !!id,
  });
}

export function useStaffLeaveBalance({ staffId, leaveYear, enabled = true } = {}) {
  return useQuery({
    queryKey: ['leave-balance', staffId, leaveYear || ''],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave/balance', {
        params: clean({ staffId, leaveYear }),
      });
      return data?.data ?? null;
    },
    enabled: enabled && !!staffId,
    staleTime: 30_000,
  });
}

export function useApproveLeave({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }) => {
      const { data } = await apiClient.patch(`/leave/${id}/approve`, clean({ note }));
      return data;
    },
    onSuccess: (res) => {
      invalidateLeave(queryClient, { attendance: true });
      Toast.show({ type: 'success', text1: res?.message || 'Leave approved' });
      showWarnings(res);
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Approve failed', text2: errMsg(err, 'Request failed') });
    },
  });
}

export function useRejectLeave({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }) => {
      const { data } = await apiClient.patch(`/leave/${id}/reject`, { note });
      return data;
    },
    onSuccess: (res) => {
      invalidateLeave(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Leave rejected' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Reject failed', text2: errMsg(err, 'Request failed') });
    },
  });
}

export function useCancelLeave({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }) => {
      const { data } = await apiClient.patch(`/leave/${id}/cancel`, clean({ note }));
      return data;
    },
    onSuccess: (res) => {
      invalidateLeave(queryClient, { attendance: true });
      Toast.show({ type: 'success', text1: res?.message || 'Leave cancelled' });
      showWarnings(res);
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Cancel failed', text2: errMsg(err, 'Request failed') });
    },
  });
}

/** Create on behalf of a staff member or student; `approve: true` approves it too. */
export function useCreateLeave({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/leave', payload);
      return data;
    },
    onSuccess: (res, vars) => {
      invalidateLeave(queryClient, { attendance: !!vars?.approve });
      Toast.show({
        type: 'success',
        text1: res?.message || (vars?.approve ? 'Leave recorded and approved' : 'Leave recorded'),
      });
      showWarnings(res);
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Could not save leave',
        text2: errMsg(err, 'Request failed'),
      });
    },
  });
}
