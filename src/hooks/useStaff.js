import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { fetchData } from '../services/api';

export function useStaffList({ page, limit, filters, branchId, enabled = true }) {
  const params = {
    name: filters?.name || undefined,
    serialNumber: filters?.serialNumber || undefined,
    designation: filters?.designation || undefined,
    staffType: filters?.staffType || undefined,
    employmentType: filters?.employmentType || undefined,
    gender: filters?.gender || undefined,
    isActive: filters?.isActive === '' ? undefined : filters?.isActive,
    fromDate: filters?.fromDate || undefined,
    toDate: filters?.toDate || undefined,
    branchId: branchId || undefined,
  };

  return useQuery({
    queryKey: ['staff', page, limit, params],
    queryFn: () =>
      fetchData({
        url: '/staff/list',
        page,
        limit,
        ...params,
      }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useStaffDetail(staffId) {
  return useQuery({
    queryKey: ['staff-detail', staffId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/staff/${staffId}`);
      return data;
    },
    enabled: !!staffId,
    staleTime: 60_000,
  });
}

export function useCreateStaff({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.post('/staff/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      Toast.show({ type: 'success', text1: res?.message || 'Staff created' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Could not create staff';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateStaff({ staffId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.put(`/staff/${staffId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-detail', staffId] });
      Toast.show({ type: 'success', text1: res?.message || 'Staff updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Could not update staff';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useToggleStaffStatus({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staffId) => {
      const { data } = await apiClient.patch(`/staff/${staffId}/toggle-status`);
      return { ...data, staffId };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-detail', res.staffId] });
      Toast.show({ type: 'success', text1: res?.message || 'Status updated' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Toggle failed';
      Toast.show({ type: 'error', text1: 'Toggle failed', text2: msg });
    },
  });
}

export function useDeleteStaff({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staffId) => {
      const { data } = await apiClient.delete(`/staff/${staffId}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      Toast.show({ type: 'success', text1: res?.message || 'Staff deleted' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Delete failed';
      Toast.show({ type: 'error', text1: 'Delete failed', text2: msg });
    },
  });
}

export function useRolesDropdown({ branchId, enabled = true } = {}) {
  return useQuery({
    queryKey: ['roles-dropdown', branchId],
    queryFn: async () => {
      const { data } = await apiClient.get('/role/list', {
        params: { page: 1, limit: 100, branchId: branchId || undefined },
      });
      return data;
    },
    enabled: enabled && !!branchId,
    staleTime: 5 * 60_000,
  });
}
