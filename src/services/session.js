import { router } from 'expo-router';
import { useTokenStore } from '../store/tokenStore';
import { useUserStore } from '../store/userStore';
import { queryClient } from './queryClient';
import { clearAcademicYearStartMonth } from '../utils/academicYear';

// Session generation: bumped whenever the signed-in session ends or is
// replaced. A token refresh started under an older generation must not write
// its tokens back (that would resurrect a logged-out session) nor retry.
let sessionGeneration = 0;
export const getSessionGeneration = () => sessionGeneration;
export const bumpSessionGeneration = () => {
  sessionGeneration += 1;
  return sessionGeneration;
};

// Wipes every trace of the signed-in account on this device: tokens, the
// persisted user, and all cached server data. Every logout path (user-initiated
// or forced by a dead refresh token) goes through here.
export function clearSession() {
  bumpSessionGeneration();
  useTokenStore.getState().clearTokens();
  useUserStore.getState().clearUser();
  queryClient.cancelQueries();
  queryClient.clear();
  // The school's academic year month must not carry over to the next user: a
  // slow or failed settings request for them falls back to the default.
  clearAcademicYearStartMonth();
}

export function clearSessionAndRedirect() {
  clearSession();
  router.replace('/(auth)/signin');
}
