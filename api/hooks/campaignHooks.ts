import { useQuery } from '@tanstack/react-query';
import * as campaignsService from '@/api/services/campaigns';
import { QUERY_KEYS } from '@/lib/constants';

export function useCampaigns(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.campaigns(orgId) : ['campaigns', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => campaignsService.fetchCampaigns(orgId as string),
    staleTime: 60_000,
  });
}

export function useCampaign(orgId: string | null, id: string | undefined) {
  return useQuery({
    queryKey: orgId && id ? QUERY_KEYS.campaign(orgId, id) : ['campaign', 'none'],
    enabled: Boolean(orgId && id),
    queryFn: () => campaignsService.fetchCampaign(id as string, orgId as string),
    staleTime: 60_000,
  });
}
