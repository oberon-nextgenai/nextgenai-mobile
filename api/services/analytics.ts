import { http } from '../client/http';
import { PATHS } from '../client/paths';
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
