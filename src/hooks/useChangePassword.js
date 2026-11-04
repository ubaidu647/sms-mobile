import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import apiClient from '../services/apiClient';
import { useTokenStore } from '../store/tokenStore';
import { useUserStore } from '../store/userStore';
import { homeHref } from '../utils/permissions';
import { bumpSessionGeneration, clearSessionAndRedirect } from '../services/session';
import { tokensFromChangeResponse } from '../utils/changePassword';

/**
 * POST /auth/change-password. The server ends EVERY session of the account —
 * this device's old tokens included — and answers with a fresh pair for this
 * device, which must replace the stored ones or the next request signs out.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const res = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      return res.data;
    },
    onSuccess: (body) => {
      const tokens = tokensFromChangeResponse(body);
      if (!tokens) {
        // Password changed, but no session came back: sign out cleanly.
        Toast.show({
          type: 'success',
          text1: 'Password changed',
          text2: 'Please sign in again with your new password.',
        });
        clearSessionAndRedirect();
        return;
      }
      // A refresh already in flight carries the revoked refresh token; a new
      // generation makes it drop its result instead of overwriting (or
      // clearing) the session stored here.
      bumpSessionGeneration();
      useTokenStore.getState().setTokens(tokens);
      // A forced change is done: drop the flag and continue to the app.
      const { user, setUser } = useUserStore.getState();
      const wasForced = user?.mustChangePassword === true;
      if (wasForced) setUser({ ...user, mustChangePassword: false });
      Toast.show({
        type: 'success',
        text1: 'Password changed',
        text2: body?.message || 'You have been signed out on other devices.',
      });
      if (wasForced) router.replace(homeHref(user?.role));
      else if (router.canGoBack()) router.back();
      else router.replace('/(app)/settings');
    },
  });
}
