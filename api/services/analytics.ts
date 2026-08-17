import { http } from '../client/http';
import { PATHS } from '../client/paths';
// DEMO ONLY — DO NOT MERGE: ledger-coherent dashboard fixtures.
import { DEMO_APPROVALS } from '../demo/flags';
import { demoAnalyticsDashboard } from '../demo/analyticsDemo';
import type {
  AnalyticsDashboard,
  AnalyticsCallSummary,
  AnalyticsAgentRow,
  AgentDetails,
  NdsDashboardData,
  NdsPeriod,
  MmrCampaign,
} from './types';

export async function fetchDashboard(
  orgId: string,
  params?: { from?: string; to?: string },
): Promise<AnalyticsDashboard> {
  // DEMO ONLY — DO NOT MERGE: the deck's numbers are the ledger's, always.
  // The live Retell dashboard reports a near-empty org (8 calls, $ metering)
  // that contradicts every other tab; determinism beats freshness on stage.
  if (DEMO_APPROVALS) {
    const days =
      params?.from && params?.to
        ? (new Date(params.to).getTime() - new Date(params.from).getTime()) / 86_400_000
        : 7;
    return demoAnalyticsDashboard(days > 20 ? '30d' : '7d');
  }
  const res = await http.get<AnalyticsDashboard>(PATHS.analytics.dashboard(orgId), { params });
  return res.data;
}

interface BackendCallsResponse {
  calls: AnalyticsCallSummary[];
}

export async function fetchCalls(
  orgId: string,
  params?: { from?: string; to?: string; assistantId?: string },
): Promise<AnalyticsCallSummary[]> {
  const res = await http.get<
    AnalyticsCallSummary[] | BackendCallsResponse | { data?: AnalyticsCallSummary[] }
  >(PATHS.analytics.calls(orgId), { params });
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as BackendCallsResponse).calls)) {
    return (data as BackendCallsResponse).calls;
  }
  if (data && Array.isArray((data as { data?: AnalyticsCallSummary[] }).data)) {
    return (data as { data: AnalyticsCallSummary[] }).data;
  }
  return [];
}

interface BackendAgentsAnalyticsResponse {
  agents: AnalyticsAgentRow[];
}

export async function fetchAgentsAnalytics(
  orgId: string,
  params?: { from?: string; to?: string },
): Promise<AnalyticsAgentRow[]> {
  const res = await http.get<
    AnalyticsAgentRow[] | BackendAgentsAnalyticsResponse | { data?: AnalyticsAgentRow[] }
  >(PATHS.analytics.agents(orgId), { params });
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as BackendAgentsAnalyticsResponse).agents)) {
    return (data as BackendAgentsAnalyticsResponse).agents;
  }
  if (data && Array.isArray((data as { data?: AnalyticsAgentRow[] }).data)) {
    return (data as { data: AnalyticsAgentRow[] }).data;
  }
  return [];
}

export async function fetchAgentDetails(
  orgId: string,
  assistantId: string,
): Promise<AgentDetails> {
  const res = await http.get<AgentDetails>(
    PATHS.analytics.agentDetails(orgId, assistantId),
  );
  return res.data;
}

export async function fetchNdsDashboard(
  orgId: string,
  period: NdsPeriod = '7d',
): Promise<NdsDashboardData> {
  const res = await http.get<NdsDashboardData>(
    PATHS.analytics.ndsBackgroundChecks(orgId),
    { params: { period } },
  );
  return res.data;
}

interface MmrCampaignsResponse {
  data?: MmrCampaign[];
  metadata?: { total?: number };
}

export async function fetchMmrCampaigns(
  orgId: string,
): Promise<MmrCampaign[]> {
  const res = await http.get<
    MmrCampaign[] | MmrCampaignsResponse | { campaigns: MmrCampaign[] }
  >(PATHS.analytics.mmrCampaigns, {
    params: { organizationId: orgId, type: 'mmr' },
  });
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as MmrCampaignsResponse).data)) {
    return (data as MmrCampaignsResponse).data ?? [];
  }
  if (data && Array.isArray((data as { campaigns?: MmrCampaign[] }).campaigns)) {
    return (data as { campaigns: MmrCampaign[] }).campaigns;
  }
  return [];
}
