import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { fetchData } from '../services/api';
import { idempotencyHeaders } from '../utils/idempotency';

// ────────────── Salary Structures ──────────────

export function useStructuresList({
  page = 1,
  limit = 20,
  staffId,
  branchId,
  isActive,
  enabled = true,
}) {
  return useQuery({
    queryKey: [
      'staff-salary-structures',
      page,
      limit,
      staffId || '',
      branchId || '',
      isActive ?? '',
    ],
    queryFn: () => {
      const params = {};
      if (staffId) params.staffId = staffId;
      if (branchId) params.branchId = branchId;
      if (isActive !== '' && isActive !== undefined) params.isActive = isActive;
      return fetchData({ url: '/staff-salary/structure', page, limit, ...params });
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useActiveStructure({ staffId, enabled = true }) {
  return useQuery({
    queryKey: ['staff-salary-active', staffId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/staff-salary/structure/staff/${staffId}`);
      return data;
    },
    enabled: enabled && !!staffId,
    staleTime: 30_000,
  });
}

export function useStructureDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['staff-salary-structure-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/staff-salary/structure/${id}`);
      return data?.data;
    },
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateStructure({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/staff-salary/structure', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff-salary-structures'] });
      queryClient.invalidateQueries({ queryKey: ['staff-salary-active'] });
      Toast.show({ type: 'success', text1: res?.message || 'Structure saved' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save';
      Toast.show({ type: 'error', text1: 'Save failed', text2: msg });
    },
  });
}

export function useUpdateStructure({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/staff-salary/structure/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff-salary-structures'] });
      queryClient.invalidateQueries({ queryKey: ['staff-salary-active'] });
      queryClient.invalidateQueries({ queryKey: ['staff-salary-structure-detail', id] });
      Toast.show({ type: 'success', text1: res?.message || 'Structure updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useDeactivateStructure({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/staff-salary/structure/${id}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff-salary-structures'] });
      queryClient.invalidateQueries({ queryKey: ['staff-salary-active'] });
      Toast.show({ type: 'success', text1: res?.message || 'Structure deactivated' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to deactivate';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

// ────────────── Payslips ──────────────

export function usePayslipsList({
  page = 1,
  limit = 20,
  staffId,
  branchId,
  month,
  status,
  enabled = true,
}) {
  return useQuery({
    queryKey: ['payslips', page, limit, staffId || '', branchId || '', month || '', status || ''],
    queryFn: () => {
      const params = {};
      if (staffId) params.staffId = staffId;
      if (branchId) params.branchId = branchId;
      if (month) params.month = month;
      if (status) params.status = status;
      return fetchData({ url: '/staff-salary/payslip', page, limit, ...params });
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePayslipDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['payslip-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/staff-salary/payslip/${id}`);
      return data?.data ?? data;
    },
    enabled: enabled && !!id,
    staleTime: 0,
  });
}

export function useBranchPayslipSummary({ branchId, month, enabled = true }) {
  return useQuery({
    queryKey: ['payslip-summary', branchId || '', month || ''],
    queryFn: async () => {
      const { data } = await apiClient.get('/staff-salary/payslip/branch/summary', {
        params: { branchId, month },
      });
      return data;
    },
    enabled: enabled && !!branchId && !!month,
    staleTime: 30_000,
  });
}

// Server pages history (max 120 per page); the envelope's `total` is the full
// count so callers can show "showing X of Y" and page through the rest.
export function useStaffPayslipHistory({ staffId, page = 1, limit = 24, enabled = true }) {
  return useQuery({
    queryKey: ['payslip-history', staffId, page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/staff-salary/payslip/staff/${staffId}/history`, {
        params: { page, limit },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    enabled: enabled && !!staffId,
    staleTime: 30_000,
  });
}

export function useGeneratePayslip({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/staff-salary/payslip/generate', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-history'] });
      Toast.show({ type: 'success', text1: res?.message || 'Payslip generated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate';
      Toast.show({ type: 'error', text1: 'Generate failed', text2: msg });
    },
  });
}

export function useGenerateBulkPayslips({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/staff-salary/payslip/generate-bulk', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-summary'] });
      const d = res?.data;
      Toast.show({
        type: 'success',
        text1: 'Bulk run complete',
        text2: `Created ${d?.created || 0} · Skipped ${d?.skipped || 0}`,
      });
      onSuccess?.(d);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Bulk failed';
      Toast.show({ type: 'error', text1: 'Bulk failed', text2: msg });
    },
  });
}

export function useUpdatePayslip({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/staff-salary/payslip/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['payslip-summary'] });
      Toast.show({ type: 'success', text1: res?.message || 'Payslip updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Update failed';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useFinalizePayslip({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/staff-salary/payslip/${id}/finalize`, {});
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['payslip-summary'] });
      Toast.show({ type: 'success', text1: res?.message || 'Payslip finalized' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Finalize failed';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

export function usePayPayslip({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    // `idempotencyKey` (one per opened pay form) travels as a header, not in the body
    mutationFn: async ({ idempotencyKey, ...payload }) => {
      const { data } = await apiClient.post(
        `/staff-salary/payslip/${id}/pay`,
        payload,
        idempotencyHeaders(idempotencyKey),
      );
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['payslip-summary'] });
      Toast.show({ type: 'success', text1: res?.message || 'Payslip marked paid' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to mark paid';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

export function useReversePayslipPayment({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, reason }) => {
      const { data } = await apiClient.post(
        `/staff-salary/payslip/${id}/payments/${paymentId}/reverse`,
        { reason },
      );
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['payslip-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-history'] });
      Toast.show({ type: 'success', text1: res?.message || 'Payment reversed' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Reverse failed';
      Toast.show({ type: 'error', text1: 'Reverse failed', text2: msg });
    },
  });
}

export function useCancelPayslip({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(`/staff-salary/payslip/${id}/cancel`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['payslip-summary'] });
      Toast.show({ type: 'success', text1: res?.message || 'Payslip cancelled' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Cancel failed';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

// ────────────── Policy ──────────────

export function useSalaryPolicy({ branchId, staffType, enabled = true }) {
  return useQuery({
    queryKey: ['staff-salary-policy', branchId || '', staffType || ''],
    queryFn: async () => {
      const { data } = await apiClient.get('/staff-salary/policy', {
        params: { branchId, staffType },
      });
      return data;
    },
    enabled: enabled && !!branchId && !!staffType,
    staleTime: 30_000,
  });
}

export function useUpsertSalaryPolicy({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put('/staff-salary/policy', payload);
      return data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['staff-salary-policy', vars.branchId, vars.staffType],
      });
      Toast.show({ type: 'success', text1: res?.message || 'Policy saved' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Save failed';
      Toast.show({ type: 'error', text1: 'Save failed', text2: msg });
    },
  });
}

// ────────────── Helper: staff dropdown ──────────────

export function useStaffDropdown({ branchId, enabled = true }) {
  return useQuery({
    queryKey: ['staff-dropdown-salary', branchId || ''],
    queryFn: () =>
      fetchData({
        url: '/staff/list',
        page: 1,
        limit: 500,
        branchId: branchId || undefined,
      }),
    enabled,
    staleTime: 60_000,
  });
}
