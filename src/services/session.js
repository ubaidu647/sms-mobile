import { router } from 'expo-router';
import { useTokenStore } from '../store/tokenStore';
import { useUserStore } from '../store/userStore';
import { queryClient } from './queryClient';

// Wipes every trace of the signed-in account on this device: tokens, the
// persisted user, and all cached server data. Every logout path (user-initiated
// or forced by a dead refresh token) goes through here.
export function clearSession() {
  useTokenStore.getState().clearTokens();
  useUserStore.getState().clearUser();
  queryClient.cancelQueries();
  queryClient.clear();
}

export function clearSessionAndRedirect() {
  clearSession();
  router.replace('/(auth)/signin');
}
