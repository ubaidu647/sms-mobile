import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';

/**
 * Sections the caller may mark: [{ classId, sectionId, className, sectionName }].
 * Resolves to `null` when the server doesn't have the endpoint yet (404), so the
 * pickers fall back to listing every class/section.
 */
export function useMyAttendanceSections({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['attendance-my-sections'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/attendance/my-sections');
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;
        return list;
      } catch (err) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useSectionDaily({ classId, sectionId, date, enabled = true }) {
  return useQuery({
    queryKey: ['attendance-daily', classId, sectionId, date],
    queryFn: async () => {
      const { data } = await apiClient.get('/attendance/section/daily', {
        params: { classId, sectionId, date },
      });
      return data;
    },
    enabled: enabled && !!classId && !!sectionId && !!date,
    staleTime: 15_000,
  });
}

// Parallel queries for a 7-day week
export function useWeekDaily({ classId, sectionId, dates }) {
  return useQueries({
    queries: (dates || []).map((d) => ({
      queryKey: ['attendance-daily', classId, sectionId, d],
      queryFn: async () => {
        const { data } = await apiClient.get('/attendance/section/daily', {
          params: { classId, sectionId, date: d },
        });
        return { ...data, _date: d };
      },
      enabled: !!classId && !!sectionId && !!d,
      staleTime: 30_000,
    })),
  });
}

export function useSectionSummary({ classId, sectionId, month, enabled = true }) {
  return useQuery({
    queryKey: ['attendance-summary', classId, sectionId, month],
    queryFn: async () => {
      const { data } = await apiClient.get('/attendance/section/summary', {
        params: { classId, sectionId, month },
      });
      return data;
    },
    enabled: enabled && !!classId && !!sectionId && !!month,
    staleTime: 30_000,
  });
}

export function useUnmarkedSections({ date, academicYear, enabled = true }) {
  return useQuery({
    queryKey: ['attendance-unmarked', date, academicYear || ''],
    queryFn: async () => {
      const { data } = await apiClient.get('/attendance/unmarked-sections', {
        params: { date, academicYear: academicYear || undefined },
      });
      return data;
    },
    enabled: enabled && !!date,
    staleTime: 30_000,
  });
}

export function useStudentHistory({ studentId, from, to, enabled = true }) {
  return useQuery({
    queryKey: ['attendance-student-history', studentId, from, to],
    queryFn: async () => {
      const { data } = await apiClient.get(`/attendance/student/${studentId}/history`, {
        params: { from, to },
      });
      return data;
    },
    enabled: enabled && !!studentId && !!from && !!to,
    staleTime: 30_000,
  });
}

export function useStudentSummary({ studentId, month, enabled = true }) {
  return useQuery({
    queryKey: ['attendance-student-summary', studentId, month],
    queryFn: async () => {
      const { data } = await apiClient.get(`/attendance/student/${studentId}/summary`, {
        params: { month },
      });
      return data;
    },
    enabled: enabled && !!studentId && !!month,
    staleTime: 30_000,
  });
}

export function useMarkAttendance({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/attendance/mark', payload);
      return data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['attendance-daily', vars.classId, vars.sectionId, vars.date],
      });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-unmarked'] });
      const msg = res?.message || 'Attendance saved';
      Toast.show({ type: 'success', text1: msg });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Could not save attendance';
      Toast.show({ type: 'error', text1: 'Save failed', text2: msg });
    },
  });
}
