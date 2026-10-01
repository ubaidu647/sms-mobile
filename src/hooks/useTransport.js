import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { fetchData } from '../services/api';

// ────────────── Vehicles ──────────────

export function useVehiclesList({
  page = 1,
  limit = 20,
  filters,
  branchId,
  enabled = true,
}) {
  const params = {
    registrationNumber: filters?.search || undefined,
    vehicleType: filters?.vehicleType || undefined,
    status: filters?.status || undefined,
    isActive: filters?.isActive === '' ? undefined : filters?.isActive,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['vehicles', page, limit, params],
    queryFn: () => fetchData({ url: '/transport/vehicle', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useVehiclesDropdown({ branchId, enabled = true } = {}) {
  return useQuery({
    queryKey: ['vehicles-dropdown', branchId || ''],
    queryFn: () =>
      fetchData({
        url: '/transport/vehicle',
        page: 1,
        limit: 200,
        branchId: branchId || undefined,
      }),
    enabled,
    staleTime: 60_000,
  });
}

export function useActiveVehiclesDropdown({ branchId, enabled = true } = {}) {
  return useQuery({
    queryKey: ['vehicles-active-dropdown', branchId || ''],
    queryFn: () =>
      fetchData({
        url: '/transport/vehicle',
        page: 1,
        limit: 200,
        status: 'active',
        isActive: 'true',
        branchId: branchId || undefined,
      }),
    enabled,
    staleTime: 60_000,
  });
}

export function useVehicleDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['vehicle-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/transport/vehicle/${id}`);
      return data?.data;
    },
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useVehicleRoster({ vehicleId, academicYear, enabled = true }) {
  return useQuery({
    queryKey: ['vehicle-roster', vehicleId, academicYear],
    queryFn: () =>
      fetchData({
        url: `/transport/vehicle/${vehicleId}/roster`,
        academicYear: academicYear || undefined,
      }),
    enabled: enabled && !!vehicleId,
    staleTime: 30_000,
  });
}

export function useCreateVehicle({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/transport/vehicle', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      Toast.show({ type: 'success', text1: res?.message || 'Vehicle created' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateVehicle({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/transport/vehicle/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', id] });
      Toast.show({ type: 'success', text1: res?.message || 'Vehicle updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useDeleteVehicle({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/transport/vehicle/${id}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      Toast.show({ type: 'success', text1: res?.message || 'Vehicle retired' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to retire';
      Toast.show({ type: 'error', text1: 'Retire failed', text2: msg });
    },
  });
}

// ────────────── Routes ──────────────

export function useRoutesList({
  page = 1,
  limit = 20,
  filters,
  branchId,
  enabled = true,
}) {
  const params = {
    name: filters?.search || undefined,
    status: filters?.status || undefined,
    vehicleId: filters?.vehicleId || undefined,
    isActive: filters?.isActive === '' ? undefined : filters?.isActive,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['routes', page, limit, params],
    queryFn: () => fetchData({ url: '/transport/route', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRoutesDropdown({ branchId, activeOnly = false, enabled = true } = {}) {
  return useQuery({
    queryKey: ['routes-dropdown', branchId || '', activeOnly],
    queryFn: () =>
      fetchData({
        url: '/transport/route',
        page: 1,
        limit: 200,
        branchId: branchId || undefined,
        status: activeOnly ? 'active' : undefined,
        isActive: activeOnly ? 'true' : undefined,
      }),
    enabled,
    staleTime: 60_000,
  });
}

export function useRouteDetail({ id, enabled = true }) {
  return useQuery({
    queryKey: ['route-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/transport/route/${id}`);
      return data?.data;
    },
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useRouteRoster({ routeId, academicYear, enabled = true }) {
  return useQuery({
    queryKey: ['route-roster', routeId, academicYear],
    queryFn: () =>
      fetchData({
        url: `/transport/route/${routeId}/roster`,
        academicYear: academicYear || undefined,
      }),
    enabled: enabled && !!routeId,
    staleTime: 30_000,
  });
}

export function useCreateRoute({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/transport/route', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      Toast.show({ type: 'success', text1: res?.message || 'Route created' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create';
      Toast.show({ type: 'error', text1: 'Create failed', text2: msg });
    },
  });
}

export function useUpdateRoute({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/transport/route/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['route-detail', id] });
      // A vehicle swap moves the route's riders, so rosters/assignments change too.
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-roster'] });
      queryClient.invalidateQueries({ queryKey: ['route-roster'] });
      Toast.show({ type: 'success', text1: res?.message || 'Route updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useDeleteRoute({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/transport/route/${id}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      Toast.show({ type: 'success', text1: res?.message || 'Route deactivated' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete';
      Toast.show({ type: 'error', text1: 'Delete failed', text2: msg });
    },
  });
}

// ────────────── Assignments ──────────────

export function useTransportAssignmentsList({
  page = 1,
  limit = 20,
  filters,
  branchId,
  enabled = true,
}) {
  const params = {
    routeId: filters?.routeId || undefined,
    vehicleId: filters?.vehicleId || undefined,
    academicYear: filters?.academicYear || undefined,
    status: filters?.status || undefined,
    isActive: filters?.isActive === '' ? undefined : filters?.isActive,
    branchId: branchId || undefined,
  };
  return useQuery({
    queryKey: ['transport-assignments', page, limit, params],
    queryFn: () =>
      fetchData({ url: '/transport/assignment', page, limit, ...params }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCreateAssignment({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/transport/assignment', payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-roster'] });
      queryClient.invalidateQueries({ queryKey: ['route-roster'] });
      Toast.show({ type: 'success', text1: res?.message || 'Student assigned' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to assign';
      Toast.show({ type: 'error', text1: 'Assign failed', text2: msg });
    },
  });
}

export function useUpdateAssignment({ id, onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put(`/transport/assignment/${id}`, payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-roster'] });
      queryClient.invalidateQueries({ queryKey: ['route-roster'] });
      Toast.show({ type: 'success', text1: res?.message || 'Assignment updated' });
      onSuccess?.(res?.data);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update';
      Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
    },
  });
}

export function useRemoveAssignment({ onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/transport/assignment/${id}`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-roster'] });
      queryClient.invalidateQueries({ queryKey: ['route-roster'] });
      Toast.show({ type: 'success', text1: res?.message || 'Assignment cancelled' });
      onSuccess?.(res);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to cancel';
      Toast.show({ type: 'error', text1: 'Cancel failed', text2: msg });
    },
  });
}

// ────────────── Helper: student search ──────────────

export function useStudentSearch({ search, branchId, enabled = true }) {
  return useQuery({
    queryKey: ['transport-student-search', search || '', branchId || ''],
    queryFn: () =>
      fetchData({
        url: '/student/list',
        page: 1,
        limit: 20,
        search,
        isActive: 'true',
        branchId: branchId || undefined,
      }),
    enabled: enabled && !!search && search.length >= 2,
    staleTime: 15_000,
  });
}
