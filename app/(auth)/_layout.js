import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserStore } from '../../src/store/userStore';
import { homeHref } from '../../src/utils/permissions';

export default function AuthLayout() {
  const { isAuthenticated, hasHydrated } = useAuth();
  const user = useUserStore((s) => s.user);
  if (!hasHydrated) return null;
  if (isAuthenticated) return <Redirect href={homeHref(user?.role)} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
