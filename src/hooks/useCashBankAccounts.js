import { useQuery } from '@tanstack/react-query';
import { fetchData } from '../services/api';

// The branch's cash and bank heads. No `mode`: the endpoint returns both, and
// the form filters by method, so switching method costs no request. An org-tier
// caller names the branch; the server gives a branch-tier caller its own.
export function useCashBankAccounts({ branchId } = {}) {
  return useQuery({
    queryKey: ['cash-bank-accounts', branchId || 'own'],
    queryFn: async () => {
      const res = await fetchData({
        url: '/ledger/cash-bank-accounts',
        branchId: branchId || undefined,
      });
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 60_000,
  });
}
