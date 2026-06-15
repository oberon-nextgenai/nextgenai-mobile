import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as agentsService from '@/api/services/agents';
import * as phoneNumbersService from '@/api/services/phoneNumbers';
import * as knowledgeBasesService from '@/api/services/knowledgeBases';
import { QUERY_KEYS } from '@/lib/constants';

interface UseAgentsListArgs {
  orgId: string | null;
  search?: string;
  status?: string;
  type?: 'all' | 'phone' | 'text' | 'external';
  limit?: number;
}

export function useAgentsList({
  orgId,
  search,
  status,
  type = 'all',
  limit = 20,
}: UseAgentsListArgs) {
  return useInfiniteQuery({
    queryKey: orgId ? QUERY_KEYS.agents(orgId, { search, status, type }) : ['agents', 'none'],
    enabled: Boolean(orgId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      agentsService.fetchAgents({
        organizationId: orgId as string,
        page: pageParam as number,
        limit,
        search,
        status,
        type,
        skipVapiSync: true,
      }),
    getNextPageParam: (lastPage) => {
      // Backend sends `metadata.totalPages`; fall back to `total/limit` math.
      const totalPages =
        lastPage.totalPages ??
        Math.max(1, Math.ceil((lastPage.total ?? 0) / (lastPage.limit ?? 1)));
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 60_000,
  });
}

export function useAgent(orgId: string | null, agentId: string | undefined) {
  return useQuery({
    queryKey: orgId && agentId ? QUERY_KEYS.agent(orgId, agentId) : ['agent', 'none'],
    enabled: Boolean(orgId && agentId),
    queryFn: () => agentsService.fetchAgent(agentId as string),
    staleTime: 60_000,
  });
}

/**
 * Tools sourced from the agent's installed integrations/plugins — NOT the full
 * Prime catalog. Empty when the agent has no integrations.
 */
export function useAgentTools(orgId: string | null, agentId: string | undefined) {
  return useQuery({
    queryKey:
      orgId && agentId ? QUERY_KEYS.agentTools(orgId, agentId) : ['agent-tools', 'none'],
    enabled: Boolean(orgId && agentId),
    queryFn: () => agentsService.fetchAgentTools(agentId as string),
    staleTime: 60_000,
  });
}

export function useAvailablePhoneNumbers(orgId: string | null) {
  return useQuery({
    queryKey: orgId
      ? QUERY_KEYS.phoneNumbersAvailable(orgId)
      : ['phone-numbers', 'available', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => phoneNumbersService.fetchAvailablePhoneNumbers(),
    staleTime: 60_000,
  });
}

export function useKnowledgeBases(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.knowledgeBases(orgId) : ['knowledge-bases', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => knowledgeBasesService.fetchKnowledgeBases(orgId as string),
    staleTime: 5 * 60_000,
  });
}
