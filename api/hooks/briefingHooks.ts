import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBriefings } from '@/api/services/briefings';
import { QUERY_KEYS } from '@/lib/constants';
// DEMO ONLY — DO NOT MERGE: the demo composes the morning briefing client-side
// from the live escalation-counts query so it always agrees with the tab badge.
import { DEMO_APPROVALS } from '@/api/demo/flags';
import { demoPlatformBriefing } from '@/api/demo/briefingDemo';
import { canonicalDemoRoster } from '@/api/demo/agentProfiles';
import { useEscalationCounts } from './escalationHooks';
import { useAgentsList } from './agentHooks';
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
    enabled: Boolean(orgId) && !DEMO_APPROVALS,
    queryFn: () => fetchBriefings(orgId as string),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // DEMO ONLY — DO NOT MERGE: reactive demo composition. Decisions invalidate
  // the escalation queries, so approving an item updates this card and the
  // Approvals badge in the same breath.
  const counts = useEscalationCounts(DEMO_APPROVALS ? orgId : null);
  const roster = useAgentsList({ orgId: DEMO_APPROVALS ? orgId : null });

  const demoBriefings = useMemo<OperationalBriefing[]>(() => {
    if (!DEMO_APPROVALS || !orgId || !counts.data) return [];
    const agents = roster.data?.pages.flatMap((p) => p.items) ?? [];
    const rosterCount = canonicalDemoRoster(agents).length;
    return [demoPlatformBriefing(orgId, counts.data, rosterCount)];
  }, [orgId, counts.data, roster.data]);

  if (DEMO_APPROVALS) {
    return {
      briefings: demoBriefings,
      unavailable: [] as BriefingUnavailable[],
      isPending: counts.isPending,
      isFetching: counts.isFetching,
      refetch: counts.refetch,
    };
  }

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
