import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { fetchConversations } from '@/api/services/conversations';

/** Live-ish, but not a feed: a plain refetch window rather than polling. */
const STALE_MS = 30_000;

/**
 * Every conversation in an organization.
 *
 * A `useQuery`, not a `useInfiniteQuery`, because the endpoint hands back the
 * full array with no cursor — there is nothing to page. Search and filtering
 * therefore run client-side over `data`.
 */
export function useConversations(orgId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.conversations(orgId ?? ''),
    enabled: !!orgId,
    staleTime: STALE_MS,
    queryFn: () => fetchConversations(orgId!),
  });
}
