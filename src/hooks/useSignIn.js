import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import apiClient from '../services/apiClient';
import { useAuth } from './useAuth';
import { isSuperAdmin } from '../utils/permissions';

export function useSignIn() {
  const { login } = useAuth();
  return useMutation({
    // `platform: true` signs a platform super-admin in through the system
    // portal — /auth/login rejects super-admins by design.
    mutationFn: async ({ platform = false, ...credentials }) => {
      const url = platform ? '/auth/system/login' : '/auth/login';
      const res = await apiClient.post(url, credentials);
      return res.data;
    },
    onSuccess: (response) => {
      const payload = response.data || response;
      login(payload);
      Toast.show({ type: 'success', text1: 'Logged in successfully!' });
      // Super-admins go to the system module; everyone else to the school dashboard.
      const dest = isSuperAdmin(payload.user?.role)
        ? '/(app)/system/organizations'
        : '/(app)/dashboard';
      router.replace(dest);
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message || err?.message || 'Something went wrong';
      Toast.show({ type: 'error', text1: 'Login failed', text2: message });
    },
  });
}
