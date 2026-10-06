import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { fetchData } from '../services/api';

export function useStudentList({ page, limit, filters, branchId, enabled = true }) {
  const params = {
    search: filters?.search || undefined,
    admissionNumber: filters?.admissionNumber || undefined,
    rollNumber: filters?.rollNumber || undefined,
    gender: filters?.gender || undefined,
    academicStatus: filters?.academicStatus || undefined,
    academicYear: filters?.academicYear || undefined,
    classId: filters?.classId || undefined,
    sectionId: filters?.sectionId || undefined,
    isActive: filters?.isActive === '' ? undefined : filters?.isActive,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['students', page, limit, params],
    queryFn: () => fetchData({ url: '/student/list', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useStudentDetail(studentId) {
  return useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/student/${studentId}`);
      return data;
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
}

export function useCreateStudent({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.post('/student/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      Toast.show({ type: 'success', text1: res?.message || 'Student enrolled' });
      onSuccess?.(res?.data, res);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Could not enroll student';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateStudent({ studentId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.put(`/student/${studentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-detail', studentId] });
      Toast.show({ type: 'success', text1: res?.message || 'Student updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Could not update student';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useToggleStudentStatus({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId) => {
      const { data } = await apiClient.patch(`/student/${studentId}/toggle-status`);
      return { ...data, studentId };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-detail', res.studentId] });
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

export function useTransferStudent({ studentId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch(
        `/student/${studentId}/transfer`,
        payload,
      );
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-detail', studentId] });
      Toast.show({ type: 'success', text1: res?.message || 'Student transferred' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Transfer failed';
      Toast.show({ type: 'error', text1: 'Transfer failed', text2: msg });
    },
  });
}

// Classes for the user's branch + given academic year (used by Add and Transfer)
export function useClassesDropdown({ branchId, academicYear, enabled = true } = {}) {
  return useQuery({
    queryKey: ['classes-dropdown', branchId, academicYear],
    queryFn: () =>
      fetchData({
        url: '/class/list',
        page: 1,
        limit: 200,
        branchId: branchId || undefined,
        academicYear: academicYear || undefined,
        isActive: 'true',
      }),
    enabled: enabled && !!branchId && !!academicYear,
    staleTime: 30_000,
  });
}

export function useSectionsDropdown(classId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['sections-dropdown', classId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/class/${classId}/sections`);
      return data;
    },
    enabled: enabled && !!classId,
    staleTime: 30_000,
  });
}
