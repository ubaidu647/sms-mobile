import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { keptAsLeaveCount, keptAsLeaveMessage } from '../utils/leave';
import { showWarnings } from './useLeave';

// ───────── Daily / branch views ─────────

export function useStaffBranchDaily({ branchId, date, staffType, enabled = true }) {
  return useQuery({
    queryKey: ['staff-attendance-daily', branchId, date, staffType || ''],
    queryFn: async () => {
      const { data } = await apiClient.get('/staff-attendance/branch/daily', {
        params: { branchId, date, staffType: staffType || undefined },
      });
      return data;
    },
    enabled: enabled && !!branchId && !!date,
    staleTime: 15_000,
  });
}

// Parallel queries for an arbitrary set of dates (used by the week calendar).
export function useStaffWeekDaily({ branchId, staffType, dates }) {
  return useQueries({
    queries: (dates || []).map((d) => ({
      queryKey: ['staff-attendance-daily', branchId, d, staffType || ''],
      queryFn: async () => {
        const { data } = await apiClient.get('/staff-attendance/branch/daily', {
          params: { branchId, date: d, staffType: staffType || undefined },
        });
        return { ...data, _date: d };
      },
      enabled: !!branchId && !!d,
      staleTime: 30_000,
    })),
  });
}

export function useStaffBranchSummary({ branchId, month, staffType, enabled = true }) {
  return useQuery({
    queryKey: ['staff-attendance-summary', branchId, month, staffType || ''],
    queryFn: async () => {
      const { data } = await apiClient.get('/staff-attendance/branch/summary', {
        params: { branchId, month, staffType: staffType || undefined },
      });
      return data;
    },
    enabled: enabled && !!branchId && !!month,
    staleTime: 30_000,
  });
}

// ───────── Per-staff views ─────────

export function useStaffHistory({ staffId, from, to, enabled = true }) {
  return useQuery({
    queryKey: ['staff-attendance-history', staffId, from, to],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/staff-attendance/staff/${staffId}/history`,
        { params: { from, to } },
      );
      return data;
    },
    enabled: enabled && !!staffId,
    staleTime: 30_000,
  });
}

export function useStaffMonthlySummary({ staffId, month, enabled = true }) {
  return useQuery({
    queryKey: ['staff-attendance-monthly', staffId, month],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/staff-attendance/staff/${staffId}/summary`,
        { params: { month } },
      );
      return data;
    },
    enabled: enabled && !!staffId && !!month,
    staleTime: 30_000,
  });
}

// ───────── Admin: unmarked branches for a date ─────────

export function useUnmarkedStaffBranches({ date, enabled = true }) {
  return useQuery({
    queryKey: ['staff-attendance-unmarked-branches', date],
    queryFn: async () => {
      const { data } = await apiClient.get('/staff-attendance/unmarked-branches', {
        params: { date },
      });
      return data;
    },
    enabled: enabled && !!date,
    staleTime: 30_000,
  });
}

// ───────── Mutations ─────────

export function useMarkStaffAttendance({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    // `roster` (the loaded rows) stays on the client: it is only used to tell
    // which rows this save turned absent on an approved-leave day.
    mutationFn: async ({ roster, ...payload }) => {
      const { data } = await apiClient.post('/staff-attendance/mark', payload);
      return data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['staff-attendance-daily', vars.branchId, vars.date],
      });
      // Drop weeklong cache too — calendar likely needs to refresh.
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-daily'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-unmarked-branches'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-monthly'] });
      const { created = 0, updated = 0 } = res?.data || {};
      const leaveNote = keptAsLeaveMessage(keptAsLeaveCount(vars.roster, vars.entries, 'staffId'));
      Toast.show({
        type: 'success',
        text1: 'Attendance saved',
        text2: `${created} created · ${updated} updated${leaveNote ? ` · ${leaveNote}` : ''}`,
      });
      showWarnings(res);
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Could not save attendance';
      Toast.show({ type: 'error', text1: 'Save failed', text2: msg });
    },
  });
}

export function useUpdateStaffAttendance({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`/staff-attendance/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-daily'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance-monthly'] });
      Toast.show({ type: 'success', text1: res?.message || 'Attendance updated' });
      showWarnings(res);
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || 'Update failed';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}
