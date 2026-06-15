import { useQuery } from '@tanstack/react-query';
import * as orgsService from '@/api/services/orgs';
import { QUERY_KEYS } from '@/lib/constants';

export function useDepartments(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.departments(orgId) : ['orgs', 'none', 'departments'],
    enabled: Boolean(orgId),
    queryFn: () => orgsService.fetchDepartments(orgId as string),
    staleTime: 5 * 60_000,
  });
}
