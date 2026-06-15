import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as analyticsService from '@/api/services/analytics';
import { openAnalyticsStream } from '@/api/client/sseClient';
import { PATHS } from '@/api/client/paths';
import { QUERY_KEYS } from '@/lib/constants';
import { useInstalledIntegrations } from './pluginHooks';
import type { NdsPeriod, Integration } from '@/api/services/types';

const ANALYTICS_PLUGIN_TYPE = 'agent-analytics-dashboard';

export type AnalyticsView =
  | { kind: 'nds'; integration: Integration }
  | { kind: 'mmr'; integration: Integration }
  | { kind: 'core'; integration: null }
  | { kind: 'unknown'; integration: Integration };

/**
 * Mirrors the web's plugin detection (`Analytics.tsx:101-112`): looks for an
 * installed `agent-analytics-dashboard` integration and routes to NDS / MMR /
 * core based on `configuration.dashboardType`.
 */
export function useAnalyticsRouting(orgId: string | null): {
  view: AnalyticsView | null;
  isPending: boolean;
} {
  const integrations = useInstalledIntegrations(orgId);
  const view = useMemo<AnalyticsView | null>(() => {
    if (integrations.isPending || integrations.isError) return null;
    const data = integrations.data ?? [];
    const match = data.find((i) => i.type === ANALYTICS_PLUGIN_TYPE);
    if (!match) return { kind: 'core', integration: null };
    const dashboardType = (match.configuration as { dashboardType?: string } | undefined)
      ?.dashboardType;
    if (typeof dashboardType === 'string') {
      if (dashboardType.startsWith('nds')) return { kind: 'nds', integration: match };
      if (dashboardType.startsWith('mmr')) return { kind: 'mmr', integration: match };
    }
    return { kind: 'unknown', integration: match };
  }, [integrations.data, integrations.isPending, integrations.isError]);

  return { view, isPending: integrations.isPending };
}

export function useDashboard(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.analyticsDashboard(orgId) : ['analytics', 'dashboard', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => analyticsService.fetchDashboard(orgId as string),
    staleTime: 30_000,
  });
}

export function useCalls(
  orgId: string | null,
  params?: { from?: string; to?: string; assistantId?: string },
) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.analyticsCalls(orgId, JSON.stringify(params ?? {})) : ['analytics', 'calls', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => analyticsService.fetchCalls(orgId as string, params),
    staleTime: 30_000,
  });
}

export function useAgentsAnalytics(orgId: string | null) {
  return useQuery<import('@/api/services/types').AnalyticsAgentRow[]>({
    queryKey: orgId ? QUERY_KEYS.analyticsAgents(orgId) : ['analytics', 'agents', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => analyticsService.fetchAgentsAnalytics(orgId as string),
    staleTime: 30_000,
  });
}

export function useAgentDetails(orgId: string | null, assistantId: string | null | undefined) {
  return useQuery({
    queryKey: orgId && assistantId ? QUERY_KEYS.analyticsAgentDetail(orgId, assistantId) : ['analytics', 'agent-detail', 'none'],
    enabled: Boolean(orgId && assistantId),
    queryFn: () => analyticsService.fetchAgentDetails(orgId as string, assistantId as string),
    staleTime: 30_000,
  });
}

/**
 * Subscribes to analytics SSE while the consumer is mounted and the
 * provided orgId is set. Listens to the `analytics_update` named event;
 * the payload may contain `type: 'live_sessions_update'` inside that.
 */
export function useAnalyticsStream(
  orgId: string | null,
  onUpdate?: (payload: { type?: string } & Record<string, unknown>) => void,
) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orgId) return;
    // Analytics SSE uses `react-native-sse` which is unreliable in the browser
    // for this endpoint. On web, rely on React Query's refetch-on-foreground +
    // staleTime for dashboard freshness. Native (iOS/Android) keeps the live
    // stream.
    if (Platform.OS === 'web') return;
    let closed = false;
    let es: { close: () => void } | null = null;

    void (async () => {
      try {
        const source = await openAnalyticsStream({
          path: PATHS.analytics.stream(orgId),
          onAnalyticsUpdate: (data) => {
            if (closed) return;
            onUpdate?.(data as { type?: string });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.analyticsDashboard(orgId) });
          },
          onError: () => {
            // Auto-reconnects via react-native-sse default polling interval
          },
        });
        if (closed) {
          source.close();
        } else {
          es = source;
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      closed = true;
      es?.close();
    };
  }, [orgId, qc, onUpdate]);
}

export function useNdsDashboard(orgId: string | null, period: NdsPeriod = '7d') {
  return useQuery({
    queryKey: orgId ? ['analytics', 'nds', orgId, period] : ['analytics', 'nds', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => analyticsService.fetchNdsDashboard(orgId as string, period),
    staleTime: 30_000,
  });
}

export function useMmrCampaigns(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? ['analytics', 'mmr', orgId] : ['analytics', 'mmr', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => analyticsService.fetchMmrCampaigns(orgId as string),
    staleTime: 30_000,
  });
}
