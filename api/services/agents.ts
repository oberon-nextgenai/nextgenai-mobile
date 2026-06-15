import { http } from '../client/http';
import { PATHS } from '../client/paths';
import type { Agent, PaginatedResponse } from './types';

export interface AgentsListParams {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: 'all' | 'phone' | 'text' | 'external';
  skipVapiSync?: boolean;
}

/** Raw backend shape — `{ data, metadata }` instead of `{ items, total, page, limit }`. */
interface BackendAgentsResponse {
  data: Agent[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function fetchAgents(
  params: AgentsListParams,
): Promise<PaginatedResponse<Agent> & { totalPages: number }> {
  const res = await http.get<BackendAgentsResponse>(PATHS.agents.list, {
    params: {
      organizationId: params.organizationId,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search,
      status: params.status,
      type: params.type ?? 'all',
      skipVapiSync: params.skipVapiSync ?? true,
    },
  });
  const { data = [], metadata } = res.data ?? { data: [], metadata: { total: 0, page: 1, limit: 20, totalPages: 1 } };
  return {
    items: data,
    total: metadata?.total ?? data.length,
    page: metadata?.page ?? params.page ?? 1,
    limit: metadata?.limit ?? params.limit ?? 20,
    totalPages: metadata?.totalPages ?? 1,
  };
}

export async function fetchAgent(id: string): Promise<Agent> {
  const res = await http.get<Agent>(PATHS.agents.detail(id));
  return res.data;
}

export interface CreateAgentDto {
  name: string;
  organizationId: string;
  agentType?: 'phone' | 'text' | string;
  description?: string;
  systemPrompt?: string;
  llmModel?: string;
  departmentId?: string;
  roleId?: string;
}

export async function createAgent(dto: CreateAgentDto): Promise<Agent> {
  const res = await http.post<Agent>(PATHS.agents.list, dto);
  return res.data;
}

/**
 * Partial update of an agent. Backend `UpdateAgentDto` allows any subset of
 * editable fields — name/description/status, system prompt, vapiData/voice
 * config, daily reports, knowledge bases, etc. Returns the updated Agent.
 */
export async function updateAgent(
  id: string,
  dto: Partial<Agent> & Record<string, unknown>,
): Promise<Agent> {
  const res = await http.put<Agent>(PATHS.agents.detail(id), dto);
  return res.data;
}

/** Per-agent tool sourced from the agent's installed integrations/plugins. */
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  category?: string;
  enabled: boolean;
}

/**
 * Returns ONLY the tools that this specific agent can use during execution —
 * derived from its installed integrations/plugins, not the full Prime catalog.
 * Empty array if the agent has no integrations.
 */
export async function fetchAgentTools(id: string): Promise<AgentTool[]> {
  const res = await http.get<{ tools: AgentTool[] }>(PATHS.agents.updateTools(id));
  return res.data?.tools ?? [];
}

export async function updateAgentTools(
  id: string,
  enabledTools: Record<string, boolean>,
): Promise<Agent> {
  const res = await http.patch<Agent>(PATHS.agents.updateTools(id), {
    enabledTools,
  });
  return res.data;
}

export async function softDeleteAgent(id: string): Promise<{ message?: string }> {
  const res = await http.delete<{ message?: string }>(PATHS.agents.detail(id));
  return res.data;
}

export async function restoreAgent(id: string): Promise<Agent> {
  const res = await http.post<Agent>(PATHS.agents.restoreFromTrash(id), {});
  return res.data;
}

export async function assignPhoneNumber(
  agentId: string,
  phoneNumberId: string,
): Promise<Agent> {
  const res = await http.post<Agent>(
    PATHS.agents.assignPhoneNumber(agentId),
    { phoneNumberId },
  );
  return res.data;
}

export async function unassignPhoneNumber(agentId: string): Promise<Agent> {
  const res = await http.delete<Agent>(PATHS.agents.unassignPhoneNumber(agentId));
  return res.data;
}
