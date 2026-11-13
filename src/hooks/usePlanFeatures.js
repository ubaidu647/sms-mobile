import { useCallback, useMemo } from 'react';
import { useSubscriptionStatusQuery } from './useSubscriptionGuard';
import { useSchoolSettingsData } from './useSchoolSettings';
import {
  isFeatureEnabled,
  normalizeLockedModuleDisplay,
  normalizeStatusFeatures,
} from '../utils/planFeatures';

/**
 * The school plan's add-on modules, for menus and screen guards.
 *   features  — enabled add-on keys, or null = all of them
 *   isEnabled — (featureKey) => boolean; a falsy key (core) is always enabled
 *   display   — 'lock' | 'hide': how the school wants locked modules shown
 * Fails open: while loading, on error and for platform admins everything is
 * enabled. The API still refuses calls into a module the plan lacks.
 */
export function usePlanFeatures() {
  const { data: status } = useSubscriptionStatusQuery();
  const { data: settings } = useSchoolSettingsData();

  const raw = status?.data?.features;
  const features = useMemo(() => normalizeStatusFeatures(raw), [raw]);
  const display = normalizeLockedModuleDisplay(settings?.lockedModuleDisplay);
  const isEnabled = useCallback((key) => isFeatureEnabled(features, key), [features]);

  return { features, isEnabled, display };
}
