import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { fetchOrgData } from '@/api/services/orgData';
import {
  fetchAlexAssignedMeters,
  fetchDashboardRender,
  type RenderPreset,
} from '@/api/services/analyticsEngine';

/** Org-owned Postgres aggregates (meter fleet + leasing). */
export function useOrgData(orgId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.orgData(orgId ?? ''),
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: () => fetchOrgData(orgId!),
  });
}

/** The platform query engine's rendered dashboard (schema + computed values). */
export function useDashboardRender(orgId: string | null, preset: RenderPreset) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardRender(orgId ?? '', preset),
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: () => fetchDashboardRender(orgId!, preset),
  });
}

/**
 * All-time meter assignments on Alex's campaigns (ad-hoc query, deliberately
 * unwindowed — see fetchAlexAssignedMeters). Null data hides the tile.
 */
export function useAlexAssignedMeters(orgId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.alexAssignedMeters(orgId ?? ''),
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: () => fetchAlexAssignedMeters(orgId!),
  });
}
