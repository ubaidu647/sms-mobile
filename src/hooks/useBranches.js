import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchData } from '../services/api';

export function useBranches({ page, limit, search, status, from, to }) {
  return useQuery({
    queryKey: ['branches', page, limit, search, status, from, to],
    queryFn: () =>
      fetchData({
        url: '/branch/list',
        page,
        limit,
        columnFilters: status ? { status } : undefined,
        columnFiltersOr: search ? { name: search } : undefined,
        from,
        to,
      }),
    placeholderData: keepPreviousData,
  });
}
