import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { fetchData } from '../services/api';
import { idempotencyHeaders } from '../utils/idempotency';

// ────────────── Fee Structures ──────────────

export function useFeeStructuresList({ page = 1, limit = 20, filters, branchId, enabled = true }) {
  const params = {
    classId: filters?.classId || undefined,
    academicYear: filters?.academicYear || undefined,
    isActive: filters?.isActive === '' ? undefined : filters?.isActive,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['fee-structures', page, limit, params],
    queryFn: () => fetchData({ url: '/fee/structure/list', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useFeeStructureDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['fee-structure-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/fee/structure/${id}`);
      return data?.data;
    },
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateFeeStructure({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/fee/structure', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      Toast.show({ type: 'success', text1: res?.message || 'Structure created' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Create failed';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateFeeStructure({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/fee/structure/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      queryClient.invalidateQueries({ queryKey: ['fee-structure-detail', id] });
      Toast.show({ type: 'success', text1: res?.message || 'Structure updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Update failed';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useDeleteFeeStructure({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/fee/structure/${id}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      Toast.show({ type: 'success', text1: res?.message || 'Structure deleted' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Delete failed';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

// Every balance on screen (vouchers, payments, the consolidated slip and every
// fee report — collection / outstanding / defaulters / …) moves on any voucher
// or payment write, so each such write refreshes all of them.
const FEE_QUERY_KEYS = ['payments', 'payment-detail', 'vouchers', 'voucher', 'fee-consolidated'];
const invalidateFeeQueries = (queryClient) => {
  for (const key of FEE_QUERY_KEYS) queryClient.invalidateQueries({ queryKey: [key] });
  queryClient.invalidateQueries({
    predicate: (q) => typeof q.queryKey?.[0] === 'string' && q.queryKey[0].startsWith('fee-report-'),
  });
};

// ────────────── Vouchers ──────────────

export function useVouchersList({ page = 1, limit = 20, filters, branchId, enabled = true }) {
  const params = {
    classId: filters?.classId || undefined,
    sectionId: filters?.sectionId || undefined,
    month: filters?.month || undefined,
    academicYear: filters?.academicYear || undefined,
    status: filters?.status || undefined,
    studentId: filters?.studentId || undefined,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['vouchers', page, limit, params],
    queryFn: () => fetchData({ url: '/fee/voucher/list', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useVoucherDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['voucher', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/fee/voucher/${id}`);
      return data?.data;
    },
    enabled: enabled && !!id,
    staleTime: 0,
  });
}

export function useGenerateForSection({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/fee/voucher/generate-section', payload);
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      const d = res?.data;
      Toast.show({
        type: 'success',
        text1: 'Vouchers generated',
        text2: `${d?.created || 0} created · ${d?.skipped || 0} skipped`,
      });
      onSuccess?.(d);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Generate failed', text2: msg });
    },
  });
}

export function useGenerateForStudent({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/fee/voucher/generate-student', payload);
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Voucher generated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Generate failed', text2: msg });
    },
  });
}

export function useVoidVoucher({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch(`/fee/voucher/${id}/void`, payload);
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Voucher voided' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Void failed', text2: msg });
    },
  });
}

export function useRegenerateVoucher({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(`/fee/voucher/${id}/regenerate`, payload);
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Voucher regenerated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Regenerate failed', text2: msg });
    },
  });
}

export function useRegenerateForSection({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/fee/voucher/regenerate-section', payload);
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      const d = res?.data;
      Toast.show({
        type: 'success',
        text1: 'Section regenerated',
        text2: `${d?.created || 0} created · ${d?.skipped || 0} skipped`,
      });
      onSuccess?.(d);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Regenerate failed', text2: msg });
    },
  });
}

export function useAddLateFee({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch(`/fee/voucher/${id}/late-fee`, payload);
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Late fee updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Late fee failed', text2: msg });
    },
  });
}

// ────────────── Payments ──────────────

export function usePaymentsList({ page = 1, limit = 20, filters, branchId, enabled = true }) {
  const params = {
    voucherId: filters?.voucherId || undefined,
    studentId: filters?.studentId || undefined,
    fromDate: filters?.fromDate || undefined,
    toDate: filters?.toDate || undefined,
    method: filters?.method || undefined,
    isVoid: filters?.isVoid === '' ? undefined : filters?.isVoid,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['payments', page, limit, params],
    queryFn: () => fetchData({ url: '/fee/payment/list', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePaymentDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['payment-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/fee/payment/${id}`);
      return data?.data;
    },
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useRecordPayment({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    // `idempotencyKey` (one per opened payment form) travels as a header, not in the body
    mutationFn: async ({ idempotencyKey, ...payload }) => {
      const { data } = await apiClient.post(
        '/fee/payment',
        payload,
        idempotencyHeaders(idempotencyKey),
      );
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      const r = res?.data?.payment?.receiptNumber;
      Toast.show({
        type: 'success',
        text1: 'Payment recorded',
        text2: r ? `Receipt ${r}` : undefined,
      });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Payment failed', text2: msg });
    },
  });
}

export function useVoidPayment({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch(`/fee/payment/${id}/void`, payload);
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Payment voided' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Void failed', text2: msg });
    },
  });
}

// ────────────── Consolidated (arrears) ──────────────

export function useConsolidatedView({ studentId, enabled = true }) {
  return useQuery({
    queryKey: ['fee-consolidated', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/fee/voucher/consolidated/${studentId}`);
      return data?.data;
    },
    enabled: enabled && !!studentId,
    staleTime: 0,
  });
}

export function useRecordConsolidatedPayment({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ idempotencyKey, ...payload }) => {
      const { data } = await apiClient.post(
        '/fee/payment/consolidated',
        payload,
        idempotencyHeaders(idempotencyKey),
      );
      return data;
    },
    onSuccess: (res) => {
      invalidateFeeQueries(queryClient);
      Toast.show({ type: 'success', text1: res?.message || 'Payment recorded' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Payment failed', text2: msg });
    },
  });
}

// ────────────── Reports ──────────────

export function useCollectionReport({ branchId, from, to, enabled = true }) {
  return useQuery({
    queryKey: ['fee-report-collection', branchId || '', from || '', to || ''],
    queryFn: () =>
      fetchData({
        url: '/fee/report/collection',
        branchId: branchId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: enabled && !!from && !!to,
    staleTime: 30_000,
  });
}

export function useOutstandingReport({
  branchId,
  classId,
  sectionId,
  page = 1,
  limit = 100,
  enabled = true,
}) {
  return useQuery({
    queryKey: [
      'fee-report-outstanding',
      branchId || '',
      classId || '',
      sectionId || '',
      page,
      limit,
    ],
    queryFn: () =>
      fetchData({
        url: '/fee/report/outstanding',
        page,
        limit,
        branchId: branchId || undefined,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
      }),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useDefaultersReport({
  branchId,
  branchIds,
  classId,
  sectionId,
  from,
  to,
  minOutstanding,
  includeDetails,
  page = 1,
  limit = 100,
  enabled = true,
}) {
  const branchParam = Array.isArray(branchIds)
    ? branchIds.join(',')
    : branchIds || branchId || undefined;
  return useQuery({
    queryKey: [
      'fee-report-defaulters',
      branchParam || '',
      classId || '',
      sectionId || '',
      from || '',
      to || '',
      minOutstanding || '',
      includeDetails ? '1' : '0',
      page,
      limit,
    ],
    queryFn: () =>
      fetchData({
        url: '/fee/report/defaulters',
        page,
        limit,
        branchIds: branchParam,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        from: from || undefined,
        to: to || undefined,
        minOutstanding: minOutstanding || undefined,
        includeDetails: includeDetails ? 'true' : undefined,
      }),
    enabled: enabled && !!from && !!to,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

// ────────────── Helpers ──────────────

export function useClassesForFee({ branchId, academicYear, enabled = true }) {
  return useQuery({
    queryKey: ['classes-for-fee', branchId || '', academicYear || ''],
    queryFn: () =>
      fetchData({
        url: '/class/list',
        page: 1,
        limit: 200,
        branchId: branchId || undefined,
        academicYear: academicYear || undefined,
      }),
    enabled,
    staleTime: 30_000,
  });
}

export function useSectionsForFee({ classId, enabled = true }) {
  return useQuery({
    queryKey: ['sections-for-fee', classId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/class/${classId}/sections`);
      return data;
    },
    enabled: enabled && !!classId,
    staleTime: 60_000,
  });
}

export function useStudentsForFee({ sectionId, enabled = true }) {
  return useQuery({
    queryKey: ['students-for-fee', sectionId],
    queryFn: () =>
      fetchData({
        url: '/student/list',
        page: 1,
        limit: 500,
        sectionId,
        isActive: 'true',
      }),
    enabled: enabled && !!sectionId,
    staleTime: 30_000,
  });
}
