import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../store/userStore';
import { getMySubscriptionStatus } from '../services/billing';
import { isSuperAdmin } from '../utils/permissions';
import { fromStatusResponse } from '../utils/subscriptionState';

const REFRESH_MS = 5 * 60 * 1000; // re-check so the state crosses into grace/blocked while the app is open
const UNKNOWN = { state: null, endDate: null, hardBlockAt: null, packageName: null };

const isClientError = (err) => err?.status >= 400 && err?.status < 500;

// Resolves the logged-in school's subscription state for the global guard via
// GET /subscription/me/status, which ANY signed-in tenant user may read (no
// 'view-billing' needed; schoolId comes from the token). Super-admins have no
// school → the query is disabled and the guard stays silent. While loading or on
// any error (403/404 included) we return state `null` (fail-open), so a transient
// failure never locks a school out. 4xx are not retried and stop the poll.
export const useSubscriptionGuard = () => {
  const user = useUserStore((s) => s.user);
  const isSchoolUser = !!user && !isSuperAdmin(user.role);
  const userId = user?._id || user?.id || null;

  const { data, isSuccess } = useQuery({
    queryKey: ['billing', 'me', 'subscription', 'status', userId],
    queryFn: getMySubscriptionStatus,
    enabled: isSchoolUser,
    retry: (failureCount, err) => !isClientError(err) && failureCount < 2,
    refetchInterval: (query) => (isClientError(query.state.error) ? false : REFRESH_MS),
    staleTime: 60 * 1000,
  });

  if (!isSchoolUser || !isSuccess) return UNKNOWN;

  return fromStatusResponse(data?.data ?? null);
};
