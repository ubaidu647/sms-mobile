import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { queryClient } from '../services/queryClient';
import { useUserStore } from '../store/userStore';
import { isSuperAdmin } from '../utils/permissions';
import {
  academicYearUser,
  setAcademicYearUser,
  setSchoolAcademicYearStartMonth,
  startMonthFromSettings,
} from '../utils/academicYear';

const settingsKey = (userKey) => ['school-settings', userKey];

// One request per signed-in user per app run, shared by every caller.
let loadedFor = null;
let inFlight = null;
const SETTINGS_WAIT_MS = 8000;

function loadFor(userKey) {
  // Signing out clears the active user (clearSession), so the next sign-in —
  // even as the same user — loads afresh.
  if (loadedFor === userKey && inFlight && academicYearUser() === userKey) return inFlight;
  loadedFor = userKey;
  setAcademicYearUser(userKey);
  // Never hold the app on a blank screen for a slow network: after the wait the
  // screens open with the month already known (or the default).
  const giveUp = new Promise((resolve) => {
    setTimeout(resolve, SETTINGS_WAIT_MS);
  });
  const request = apiClient
    .get('/schools/settings')
    .then((res) => {
      if (academicYearUser() !== userKey) return; // signed out / switched user meanwhile
      // The month the API itself uses, so client and server never disagree.
      setSchoolAcademicYearStartMonth(startMonthFromSettings(res.data?.data));
      // Seed the settings query (lockedModuleDisplay…) so it needs no request.
      if (res.data?.data) queryClient.setQueryData(settingsKey(userKey), res.data.data);
    })
    .catch((err) => {
      // No school (platform admin) → 403: follow the default. Offline / 5xx:
      // keep whatever month is already known.
      if (err?.response?.status === 403 && academicYearUser() === userKey) {
        setSchoolAcademicYearStartMonth(null);
      }
    });
  inFlight = Promise.race([request, giveUp]);
  return inFlight;
}

/**
 * Load the school's academic year start month once the user is signed in,
 * before the screens mount: forms and filters work out "the current academic
 * year" when they open. A failed request falls back to the default month.
 */
export function useSchoolSettings(userKey) {
  const [readyFor, setReadyFor] = useState(null);

  useEffect(() => {
    if (!userKey) return undefined;
    let live = true;
    loadFor(userKey).finally(() => {
      if (live) setReadyFor(userKey);
    });
    return () => {
      live = false;
    };
  }, [userKey]);

  return { ready: !userKey || readyFor === userKey };
}

const userKeyOf = (user) => {
  const id = user?._id || user?.id;
  return id ? String(id) : null;
};

/**
 * GET /schools/settings as a query: { academicYearStartMonth,
 * effectiveAcademicYearStartMonth, defaultAcademicYearStartMonth,
 * lockedModuleDisplay, currency, currencySymbol }. Usually already in the cache from the start-up load
 * above. Disabled for platform admins (no school).
 */
export function useSchoolSettingsData() {
  const user = useUserStore((s) => s.user);
  const userKey = userKeyOf(user);
  return useQuery({
    queryKey: settingsKey(userKey),
    queryFn: async () => (await apiClient.get('/schools/settings')).data?.data ?? null,
    enabled: !!userKey && !isSuperAdmin(user?.role),
    staleTime: 5 * 60 * 1000,
  });
}

/** PATCH /schools/settings — the school admin only (`role.isPredefined`). */
export function useUpdateSchoolSettings({ onSuccess } = {}) {
  const userKey = userKeyOf(useUserStore((s) => s.user));
  return useMutation({
    mutationFn: async (payload) => (await apiClient.patch('/schools/settings', payload)).data,
    onSuccess: (res, vars) => {
      const next = res?.data;
      if (next) {
        queryClient.setQueryData(settingsKey(userKey), next);
        if ('academicYearStartMonth' in (vars || {})) {
          setSchoolAcademicYearStartMonth(startMonthFromSettings(next));
        }
      } else {
        queryClient.invalidateQueries({ queryKey: settingsKey(userKey) });
      }
      onSuccess?.(res);
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Could not save settings',
        text2: err?.response?.data?.message || err?.message || 'Please try again.',
      });
    },
  });
}
