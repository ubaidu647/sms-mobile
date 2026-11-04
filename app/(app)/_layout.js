import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/hooks/useAuth';
import { useSchoolSettings } from '../../src/hooks/useSchoolSettings';
import { useUserStore } from '../../src/store/userStore';
import TopBar from '../../src/component/TopBar';
import DrawerMenu from '../../src/component/Drawer';
import SubscriptionGuard from '../../src/component/SubscriptionGuard';
import { useColors, useIsDark } from '../../src/theme/useColors';

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isAuthenticated, hasHydrated, loading } = useAuth();
  const C = useColors();
  const isDark = useIsDark();
  const { user } = useUserStore();
  const segments = useSegments();
  const signedIn = hasHydrated && isAuthenticated;
  // The API refuses everything but change-password until it is done, so the
  // app (and its data loading) waits behind that screen.
  const mustChangePassword = signedIn && user?.mustChangePassword === true;
  // The school's academic year start month must be known before any screen
  // works out "the current academic year" for its defaults. Keyed by the real
  // user id — a placeholder key would defeat the wrong-user guard in
  // useSchoolSettings. Without an id, wait for /auth/me; if it still brings
  // none, open with the remembered/default month and no request.
  const userId = user?._id || user?.id;
  const { ready: settingsReady } = useSchoolSettings(
    signedIn && !mustChangePassword && userId ? String(userId) : null,
  );

  if (!hasHydrated) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/signin" />;
  if (mustChangePassword) {
    if (segments[segments.length - 1] !== 'change-password') {
      return <Redirect href="/(app)/change-password" />;
    }
    // No top bar, drawer or subscription poll: nothing else calls the API.
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.body, { backgroundColor: C.bg }]}>
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
              contentStyle: { backgroundColor: C.bg },
            }}
          />
        </View>
      </SafeAreaView>
    );
  }
  if (!userId && loading) return null;
  if (!settingsReady) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <TopBar onMenu={() => setDrawerOpen(true)} />
      <SubscriptionGuard />
      <View style={[styles.body, { backgroundColor: C.bg }]}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: C.bg },
          }}
        />
      </View>
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
});
