import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { QUERY_KEYS } from '@/lib/constants';
import {
  approveEscalation,
  assignEscalation,
  fetchEscalation,
  fetchEscalationCounts,
  fetchEscalations,
  rejectEscalation,
  type DecideEscalationBody,
  type Escalation,
  type EscalationSeverity,
  type EscalationStatus,
} from '@/api/services/escalations';

/** The tab badge polls this, so it stays fresher than the default 60s staleTime. */
const COUNTS_STALE_MS = 20_000;

/** Index signature so the filter object can key a React Query cache entry. */
export interface EscalationFilters extends Record<string, unknown> {
  status?: EscalationStatus;
  severity?: EscalationSeverity;
  assigneeId?: string;
}

/**
 * The escalation inbox, keyset-paginated.
 *
 * Uses the server's opaque `nextCursor` rather than a page number: the queue
 * re-sorts as SLAs tick down, and an offset would silently skip or repeat rows
 * as items move between pages.
 */
export function useEscalations(orgId: string | null, filters: EscalationFilters = {}) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.escalations(orgId ?? '', filters),
    enabled: !!orgId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchEscalations({ organizationId: orgId!, cursor: pageParam, ...filters }),
    getNextPageParam: last => last.nextCursor ?? undefined,
  });
}

/** Flattens the paged inbox into a single list for rendering. */
export function useEscalationList(orgId: string | null, filters: EscalationFilters = {}) {
  const query = useEscalations(orgId, filters);
  const items: Escalation[] = query.data?.pages.flatMap(p => p.data) ?? [];
  return { ...query, items };
}

export function useEscalationCounts(orgId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.escalationCounts(orgId ?? ''),
    enabled: !!orgId,
    staleTime: COUNTS_STALE_MS,
    queryFn: () => fetchEscalationCounts(orgId!),
  });
}

export function useEscalation(orgId: string | null, id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.escalation(orgId ?? '', id ?? ''),
    enabled: !!orgId && !!id,
    queryFn: () => fetchEscalation(orgId!, id!),
  });
}

/**
 * Invalidate every escalation view for an org.
 *
 * The prefix `['escalations', orgId]` covers the list (whatever its filters),
 * the counts, and any open detail — a decision changes all three, and missing
 * one leaves a resolved item still showing as pending.
 */
function useInvalidateEscalations(orgId: string | null) {
  const qc = useQueryClient();
  return () => {
    if (!orgId) return;
    void qc.invalidateQueries({ queryKey: ['escalations', orgId] });
  };
}

export function useAssignEscalation(orgId: string | null) {
  const invalidate = useInvalidateEscalations(orgId);
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId?: string }) =>
      assignEscalation(id, { organizationId: orgId!, assigneeId }),
    onSuccess: escalation => {
      invalidate();
      Toast.show({ type: 'success', text1: `${escalation.ref} assigned` });
    },
  });
}

export function useDecideEscalation(orgId: string | null) {
  const invalidate = useInvalidateEscalations(orgId);

  return useMutation({
    mutationFn: ({
      id,
      decision,
      ...body
    }: { id: string; decision: 'approve' | 'reject' } & Omit<
      DecideEscalationBody,
      'organizationId'
    >) => {
      const payload: DecideEscalationBody = { organizationId: orgId!, ...body };
      return decision === 'approve'
        ? approveEscalation(id, payload)
        : rejectEscalation(id, payload);
    },
    onSuccess: (result, variables) => {
      invalidate();
      Toast.show({
        type: 'success',
        // The button said "Approve", so the confirmation says "Approved".
        text1: variables.decision === 'approve' ? 'Approved' : 'Rejected',
        text2: result.escalation.ref,
      });
    },
    onError: error => {
      // A 404 here means someone else already decided it — worth saying plainly
      // rather than showing a generic failure.
      const status = (error as { response?: { status?: number } })?.response?.status;
      Toast.show({
        type: 'error',
        text1: status === 404 ? 'Already decided' : 'Could not record your decision',
        text2:
          status === 404
            ? 'Someone else answered this one first.'
            : (error as Error)?.message,
      });
    },
  });
}
