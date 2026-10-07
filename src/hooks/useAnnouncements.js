import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { fetchData } from '../services/api';

// ────────────── List / Detail ──────────────

export function useAnnouncementsList({
  page = 1,
  limit = 20,
  filters,
  branchId,
  enabled = true,
}) {
  const params = {
    search: filters?.search || undefined,
    status: filters?.status || undefined,
    type: filters?.type || undefined,
    priority: filters?.priority || undefined,
    isPinned: filters?.isPinned === '' ? undefined : filters?.isPinned,
    fromDate: filters?.fromDate || undefined,
    toDate: filters?.toDate || undefined,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['announcements', page, limit, params],
    queryFn: () => fetchData({ url: '/announcement/list', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAnnouncementDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['announcement-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/announcement/${id}`);
      return data?.data;
    },
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

// ────────────── Personal feed (paginated) ──────────────

export function useAnnouncementFeed({ enabled = true } = {}) {
  return useInfiniteQuery({
    queryKey: ['announcement-feed'],
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      fetchData({ url: '/announcement/feed', page: pageParam, limit: 20 }),
    getNextPageParam: (last, allPages) => {
      const total = last?.total ?? 0;
      const loaded = allPages.reduce((s, p) => s + (p?.data?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
    enabled,
    staleTime: 30_000,
  });
}

// ────────────── Mutations ──────────────

export function useCreateAnnouncement({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.post('/announcement/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement-feed'] });
      Toast.show({ type: 'success', text1: res?.message || 'Announcement created' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateAnnouncement({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/announcement/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['announcement-feed'] });
      Toast.show({ type: 'success', text1: res?.message || 'Announcement updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Update failed';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useDeleteAnnouncement({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/announcement/${id}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement-feed'] });
      Toast.show({ type: 'success', text1: res?.message || 'Announcement deleted' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Delete failed';
      Toast.show({ type: 'error', text1: 'Delete failed', text2: msg });
    },
  });
}

export function usePublishAnnouncement({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch(`/announcement/${id}/publish`);
      return data;
    },
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['announcement-feed'] });
      Toast.show({ type: 'success', text1: res?.message || 'Announcement published' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Publish failed';
      Toast.show({ type: 'error', text1: 'Publish failed', text2: msg });
    },
  });
}

export function useArchiveAnnouncement({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.patch(`/announcement/${id}/archive`);
      return data;
    },
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['announcement-feed'] });
      Toast.show({ type: 'success', text1: res?.message || 'Announcement archived' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Archive failed';
      Toast.show({ type: 'error', text1: 'Archive failed', text2: msg });
    },
  });
}

// ────────────── Attachments ──────────────

export function useAddAttachment({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.post(`/announcement/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement-detail', id] });
      Toast.show({ type: 'success', text1: res?.message || 'Attachment added' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Upload failed';
      Toast.show({ type: 'error', text1: 'Upload failed', text2: msg });
    },
  });
}

export function useRemoveAttachment({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId) => {
      const { data } = await apiClient.delete(
        `/announcement/${id}/attachments/${attachmentId}`,
      );
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement-detail', id] });
      Toast.show({ type: 'success', text1: res?.message || 'Attachment removed' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Remove failed';
      Toast.show({ type: 'error', text1: 'Remove failed', text2: msg });
    },
  });
}

// ────────────── Read tracking ──────────────

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.post(`/announcement/${id}/mark-read`);
      return { ...data, id };
    },
    onSuccess: (res) => {
      // Optimistically flag this entry as read across feed pages.
      queryClient.setQueryData(['announcement-feed'], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: (old.pages || []).map((p) => ({
            ...p,
            data: (p?.data || []).map((a) =>
              a._id === res.id ? { ...a, isRead: true } : a,
            ),
          })),
        };
      });
    },
  });
}

export function useAcknowledgeAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.post(`/announcement/${id}/acknowledge`);
      return { ...data, id };
    },
    onSuccess: (res) => {
      queryClient.setQueryData(['announcement-feed'], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: (old.pages || []).map((p) => ({
            ...p,
            data: (p?.data || []).map((a) =>
              a._id === res.id ? { ...a, isRead: true, acknowledged: true } : a,
            ),
          })),
        };
      });
      Toast.show({ type: 'success', text1: 'Acknowledged' });
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Failed', text2: msg });
    },
  });
}

// The reader list is paged on the backend (counts cover every reader); each
// page resolves to the stats payload `{ totalReads, ackCount, reads, ... }`.
export function useAnnouncementReadStats({ id, enabled = true }) {
  return useInfiniteQuery({
    queryKey: ['announcement-read-stats', id],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get(`/announcement/${id}/read-stats`, {
        params: { page: pageParam, limit: 500 },
      });
      return data?.data;
    },
    getNextPageParam: (last, allPages) => {
      const total = last?.totalReads ?? 0;
      const loaded = allPages.reduce((s, p) => s + (p?.reads?.length || 0), 0);
      return loaded < total && last?.reads?.length ? allPages.length + 1 : undefined;
    },
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

// ────────────── Helpers ──────────────

export function useClassesForAnnouncement({ branchId, academicYear, enabled = true }) {
  return useQuery({
    queryKey: ['classes-for-announcement', branchId || '', academicYear || ''],
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

export function useSectionsForAnnouncement({ classId, enabled = true }) {
  return useQuery({
    queryKey: ['sections-for-announcement', classId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/class/${classId}/sections`);
      return data;
    },
    enabled: enabled && !!classId,
    staleTime: 60_000,
  });
}

export function useStaffForAnnouncement({ branchId, enabled = true }) {
  return useQuery({
    queryKey: ['staff-for-announcement', branchId || ''],
    queryFn: () =>
      fetchData({
        url: '/staff/list',
        page: 1,
        limit: 500,
        branchId: branchId || undefined,
        isActive: 'true',
      }),
    enabled,
    staleTime: 30_000,
  });
}
