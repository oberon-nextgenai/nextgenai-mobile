import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { fetchConversations } from '@/api/services/conversations';
import { fetchConversationFeed } from '@/api/services/conversationFeed';
import { useAgentsList } from './agentHooks';

/** Live-ish, but not a feed: a plain refetch window rather than polling. */
const STALE_MS = 30_000;

/** The export endpoint fans out to live providers — refetch sparingly. */
const FEED_STALE_MS = 60_000;

/**
 * The rich cross-channel conversation feed, org-wide or per-agent.
 *
 * Reads the roster through the shared `useAgentsList` cache and passes it to
 * the service explicitly, so demo fixtures resolve the same real agent ids no
 * matter which screen mounts first.
 */
export function useConversationFeed(orgId: string | null, agentId?: string) {
  const roster = useAgentsList({ orgId });
  const agents = roster.data?.pages.flatMap((p) => p.items) ?? [];

  return useQuery({
    queryKey: QUERY_KEYS.conversationFeed(orgId ?? '', agentId),
    // The roster must be loaded first so fixture ids bind to real agents.
    enabled: !!orgId && !roster.isPending,
    staleTime: FEED_STALE_MS,
    queryFn: () =>
      fetchConversationFeed({ organizationId: orgId!, agentId, roster: agents }),
  });
}

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
