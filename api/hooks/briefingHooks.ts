import { useQuery } from '@tanstack/react-query';
import { fetchBriefings } from '@/api/services/briefings';
import { QUERY_KEYS } from '@/lib/constants';
import type { BriefingUnavailable, OperationalBriefing } from '@/api/services/briefings';

/**
 * The workspace's morning reads.
 *
 * Deliberately exposes no error state. The Brief screen's loading and error
 * gates belong to the core dashboard; a briefing that fails to load must cost
 * the user a missing card, never a screen that refuses to render. What the
 * server *does* tell us — a provider it could not read — arrives in
 * `unavailable`, and that is worth showing.
 *
 * Five-minute staleness: the source is precomputed overnight and moves on the
 * order of hours, so pull-to-refresh is the only thing that should refetch it.
 */
export function useOperationalBriefings(orgId: string | null) {
  const query = useQuery({
    queryKey: orgId ? QUERY_KEYS.briefings(orgId) : ['briefings', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => fetchBriefings(orgId as string),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const briefings: OperationalBriefing[] = query.data?.briefings ?? [];
  const unavailable: BriefingUnavailable[] = query.data?.unavailable ?? [];

  return {
    briefings,
    unavailable,
    isPending: query.isPending,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
