import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { fetchData } from '../services/api';

// ───────── Class ─────────

export function useClassList({ page, limit, filters, branchId, enabled = true }) {
  const params = {
    grade: filters?.grade || undefined,
    classType: filters?.classType || undefined,
    medium: filters?.medium || undefined,
    academicYear: filters?.academicYear || undefined,
    isActive: filters?.isActive === '' ? undefined : filters?.isActive,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['classes', page, limit, params],
    queryFn: () => fetchData({ url: '/class/list', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useClassDetail(classId) {
  return useQuery({
    queryKey: ['class-detail', classId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/class/${classId}`);
      return data;
    },
    enabled: !!classId,
    staleTime: 60_000,
  });
}

export function useCreateClass({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/class/create', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      Toast.show({ type: 'success', text1: res?.message || 'Class created' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Could not create class';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateClass({ classId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/class/${classId}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class-detail', classId] });
      Toast.show({ type: 'success', text1: res?.message || 'Class updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Could not update class';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useToggleClassStatus({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classId) => {
      const { data } = await apiClient.patch(`/class/${classId}/toggle-status`);
      return { ...data, classId };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class-detail', res.classId] });
      Toast.show({ type: 'success', text1: res?.message || 'Status updated' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Toggle failed';
      Toast.show({ type: 'error', text1: 'Toggle failed', text2: msg });
    },
  });
}

// ───────── Sections ─────────

export function useSectionsList(classId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['sections', classId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/class/${classId}/sections`);
      return data;
    },
    enabled: enabled && !!classId,
    staleTime: 30_000,
  });
}

export function useCreateSection({ classId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(
        `/class/${classId}/sections/create`,
        payload,
      );
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sections', classId] });
      queryClient.invalidateQueries({ queryKey: ['class-detail', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      Toast.show({ type: 'success', text1: res?.message || 'Section created' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not create section';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateSection({ classId, sectionId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(
        `/class/${classId}/sections/${sectionId}`,
        payload,
      );
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sections', classId] });
      queryClient.invalidateQueries({ queryKey: ['class-detail', classId] });
      Toast.show({ type: 'success', text1: res?.message || 'Section updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not update section';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useToggleSectionStatus({ classId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sectionId) => {
      const { data } = await apiClient.patch(
        `/class/${classId}/sections/${sectionId}/toggle-status`,
      );
      return { ...data, sectionId };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sections', classId] });
      queryClient.invalidateQueries({ queryKey: ['class-detail', classId] });
      Toast.show({ type: 'success', text1: res?.message || 'Section status updated' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Toggle failed';
      Toast.show({ type: 'error', text1: 'Toggle failed', text2: msg });
    },
  });
}

// Reusable dropdown: teaching staff for class/section teacher selection.
export function useTeachingStaffDropdown({ branchId, enabled = true } = {}) {
  return useQuery({
    queryKey: ['staff-teaching-dropdown', branchId],
    queryFn: () =>
      fetchData({
        url: '/staff/list',
        page: 1,
        limit: 200,
        staffType: 'teaching',
        branchId: branchId || undefined,
      }),
    enabled,
    staleTime: 60_000,
  });
}
