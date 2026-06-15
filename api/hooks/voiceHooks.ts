import { useQuery } from '@tanstack/react-query';
import * as voicesService from '@/api/services/voices';
import { QUERY_KEYS } from '@/lib/constants';

interface UseVoicesArgs {
  orgId: string | null;
  provider?: string;
  gender?: string;
}

export function useVoices({ orgId, provider, gender }: UseVoicesArgs) {
  return useQuery({
    queryKey: orgId
      ? QUERY_KEYS.voices(orgId, { provider, gender })
      : ['voices', 'none'],
    enabled: Boolean(orgId),
    queryFn: () =>
      voicesService.fetchVoices({
        organizationId: orgId as string,
        provider,
        gender,
        active: true,
      }),
    staleTime: 5 * 60_000,
  });
}
