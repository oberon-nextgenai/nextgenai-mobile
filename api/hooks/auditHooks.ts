import { useInfiniteQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { fetchAuditLog, type AuditLogEntry, type ListAuditLogParams } from '@/api/services/audit';

/** Filters callers may narrow the trail by. `organizationId` is supplied separately. */
export interface AuditLogFilters extends Record<string, unknown> {
  collectionName?: string;
  documentId?: string;
  userId?: string;
  operation?: ListAuditLogParams['operation'];
  from?: string;
  to?: string;
}

/**
 * The organization's audit trail, newest first.
 *
 * Requires `org_admin` or above — a plain member gets a 403, which surfaces as a
 * query error rather than an empty list, so the UI can say "you don't have
 * access" instead of "nothing happened".
 */
export function useAuditLog(orgId: string | null, filters: AuditLogFilters = {}) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.auditLog(orgId ?? '', filters),
    enabled: !!orgId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchAuditLog({ organizationId: orgId!, cursor: pageParam, ...filters }),
    getNextPageParam: last => last.nextCursor ?? undefined,
  });
}

/** Flattens the paged trail for rendering. */
export function useAuditLogList(orgId: string | null, filters: AuditLogFilters = {}) {
  const query = useAuditLog(orgId, filters);
  const entries: AuditLogEntry[] = query.data?.pages.flatMap(p => p.data) ?? [];
  return { ...query, entries };
}

/**
 * One record's change history — for a "what happened to this agent?" drill-down
 * from a detail screen.
 */
export function useRecordHistory(
  orgId: string | null,
  collectionName: string | undefined,
  documentId: string | undefined,
) {
  return useAuditLog(orgId, { collectionName, documentId });
}
