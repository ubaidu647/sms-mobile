import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { fetchData } from '../services/api';

// ────────────── Exam list / detail / CRUD ──────────────

export function useExamsList({
  page = 1,
  limit = 20,
  filters,
  branchId,
  enabled = true,
}) {
  const params = {
    classId: filters?.classId || undefined,
    type: filters?.type || undefined,
    status: filters?.status || undefined,
    academicYear: filters?.academicYear || undefined,
    isActive: filters?.isActive === '' ? undefined : filters?.isActive === 'true' || filters?.isActive === true,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['exams', page, limit, params],
    queryFn: () => fetchData({ url: '/exam/list', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useExamDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['exam-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/exam/${id}`);
      return data?.data;
    },
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateExam({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/exam/create', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      Toast.show({ type: 'success', text1: res?.message || 'Exam created' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create exam';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateExam({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/exam/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-detail', id] });
      Toast.show({ type: 'success', text1: res?.message || 'Exam updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Update failed';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useDeleteExam({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/exam/${id}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      Toast.show({ type: 'success', text1: res?.message || 'Exam deleted' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Delete failed';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

export function usePublishExam({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publish = true) => {
      const path = publish ? 'publish' : 'unpublish';
      const { data } = await apiClient.patch(`/exam/${id}/${path}`);
      return { ...data, publish };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-detail', id] });
      Toast.show({
        type: 'success',
        text1: res?.publish ? 'Exam published' : 'Exam unpublished',
      });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Publish failed';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

// ────────────── Exam subjects ──────────────

export function useExamSubjectsList({ examId, enabled = true }) {
  return useQuery({
    queryKey: ['exam-subjects', examId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/exam/${examId}/subjects`);
      return data?.data;
    },
    enabled: enabled && !!examId,
    staleTime: 30_000,
  });
}

export function useAddExamSubject({ examId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(`/exam/${examId}/subjects`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exam-detail', examId] });
      queryClient.invalidateQueries({ queryKey: ['exam-subjects', examId] });
      Toast.show({ type: 'success', text1: res?.message || 'Subject added' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Add failed', text2: msg });
    },
  });
}

export function useUpdateExamSubject({ examId, id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/exam/${examId}/subjects/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exam-detail', examId] });
      queryClient.invalidateQueries({ queryKey: ['exam-subjects', examId] });
      Toast.show({ type: 'success', text1: res?.message || 'Subject updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useDeleteExamSubject({ examId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/exam/${examId}/subjects/${id}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exam-detail', examId] });
      queryClient.invalidateQueries({ queryKey: ['exam-subjects', examId] });
      Toast.show({ type: 'success', text1: res?.message || 'Subject removed' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Remove failed', text2: msg });
    },
  });
}

// ────────────── Results ──────────────

export function useExamResults({ examId, examSubjectId, sectionId, enabled = true }) {
  return useQuery({
    queryKey: ['exam-results', examId, examSubjectId || '', sectionId || ''],
    queryFn: async () => {
      const { data } = await apiClient.get(`/exam/${examId}/results`, {
        params: { examSubjectId, sectionId },
      });
      return data?.data || [];
    },
    enabled: enabled && !!examId && !!examSubjectId && !!sectionId,
    staleTime: 0,
  });
}

export function useEnterMarks({ examId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(`/exam/${examId}/results/enter`, payload);
      return data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['exam-results', examId, vars.examSubjectId, vars.sectionId],
      });
      queryClient.invalidateQueries({ queryKey: ['exam-detail', examId] });
      queryClient.invalidateQueries({ queryKey: ['section-summary', examId] });
      queryClient.invalidateQueries({ queryKey: ['result-card', examId] });
      const { created = 0, updated = 0, cleared = 0 } = res?.data || {};
      Toast.show({
        type: 'success',
        text1: 'Marks saved',
        text2: `${created} created · ${updated} updated${cleared ? ` · ${cleared} cleared` : ''}`,
      });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Save failed';
      Toast.show({ type: 'error', text1: 'Save failed', text2: msg });
    },
  });
}

export function useUpdateResult({ id, examId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/exam/results/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['exam-results', examId] });
      queryClient.invalidateQueries({ queryKey: ['section-summary', examId] });
      queryClient.invalidateQueries({ queryKey: ['result-card', examId] });
      Toast.show({ type: 'success', text1: res?.message || 'Result updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Update failed';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

// ────────────── Reports ──────────────

export function useSectionSummary({ examId, sectionId, enabled = true }) {
  return useQuery({
    queryKey: ['section-summary', examId, sectionId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/exam/${examId}/section-summary`, {
        params: { sectionId },
      });
      return data?.data;
    },
    enabled: enabled && !!examId && !!sectionId,
    staleTime: 0,
  });
}

export function useResultCard({ examId, studentId, enabled = true }) {
  return useQuery({
    queryKey: ['result-card', examId, studentId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/exam/${examId}/result-card/${studentId}`);
      return data?.data;
    },
    enabled: enabled && !!examId && !!studentId,
    staleTime: 30_000,
  });
}

// ────────────── Helpers ──────────────

export function useClassesForExam({ branchId, academicYear, enabled = true }) {
  return useQuery({
    queryKey: ['classes-for-exam', branchId || '', academicYear || ''],
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

export function useSubjectsForExam({ classId, academicYear, enabled = true }) {
  return useQuery({
    queryKey: ['subjects-for-exam', classId, academicYear || ''],
    queryFn: () =>
      fetchData({
        url: '/subject/list',
        page: 1,
        limit: 200,
        classId,
        academicYear: academicYear || undefined,
        isActive: 'true',
      }),
    enabled: enabled && !!classId,
    staleTime: 30_000,
  });
}

export function useSectionsForExam({ classId, enabled = true }) {
  return useQuery({
    queryKey: ['sections-for-exam', classId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/class/${classId}/sections`);
      return data;
    },
    enabled: enabled && !!classId,
    staleTime: 60_000,
  });
}

export function useStudentsBySection({ sectionId, enabled = true }) {
  return useQuery({
    queryKey: ['students-by-section', sectionId],
    queryFn: () =>
      fetchData({
        url: '/student/list',
        page: 1,
        limit: 500,
        sectionId,
        isActive: true,
      }),
    enabled: enabled && !!sectionId,
    staleTime: 30_000,
  });
}
