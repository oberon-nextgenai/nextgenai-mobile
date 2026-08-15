import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { fetchAuditLog, type AuditLogEntry, type ListAuditLogParams } from '@/api/services/audit';
// DEMO ONLY — DO NOT MERGE: demo decisions + per-agent seed events.
import { DEMO_APPROVALS } from '@/api/demo/flags';
import { demoDecisionsFor } from '@/api/demo/approvalsDemo';
import { profileForName } from '@/api/demo/agentProfiles';

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

/** One line of the agent's audit trail, ready to render. */
export interface AuditTrailItem {
  id: string;
  /** ISO timestamp. */
  at: string;
  /** Who acted — a person's email, or Prime as the orchestrator. */
  actor: string;
  text: string;
  tone: 'success' | 'danger' | 'neutral';
}

const HOUR = 3_600_000;

function summarizeApiRow(row: AuditLogEntry): AuditTrailItem {
  const text =
    row.operation === 'create'
      ? 'Agent deployed'
      : row.operation === 'delete'
        ? 'Agent removed'
        : 'Configuration updated';
  return {
    id: row._id,
    at: row.createdAt,
    actor: row.userEmail ?? 'Prime',
    text,
    tone: 'neutral',
  };
}

/** 'approve_technician_dispatch' → 'technician dispatch'. */
function humanizeAction(action: string): string {
  return action.replace(/^(approve|reject)_/, '').replace(/_/g, ' ');
}

/**
 * The agent's audit trail: platform audit rows for the agent record (config
 * edits, deployment) merged with decisions taken on this agent's escalations,
 * newest first. Prime is the orchestrator — orchestration events carry its
 * name.
 */
export function useAgentAudit(
  orgId: string | null,
  agentId: string | undefined,
  agentName: string | undefined,
) {
  return useQuery({
    queryKey: QUERY_KEYS.auditLog(orgId ?? '', { agentTrail: agentId ?? '' }),
    enabled: !!orgId && !!agentId,
    staleTime: 30_000,
    queryFn: async (): Promise<AuditTrailItem[]> => {
      const items: AuditTrailItem[] = [];

      try {
        const page = await fetchAuditLog({
          organizationId: orgId!,
          collectionName: 'Agent',
          documentId: agentId!,
          limit: 10,
        });
        items.push(...page.data.map(summarizeApiRow));
      } catch {
        // Non-admin session or endpoint unavailable — the trail still renders
        // from the orchestration events below.
      }

      if (DEMO_APPROVALS && agentName) {
        // DEMO ONLY — DO NOT MERGE.
        for (const d of demoDecisionsFor(orgId!, agentName)) {
          items.push({
            id: d.id,
            at: d.decidedAt,
            actor: d.decidedByEmail ?? 'Prime',
            text: `${d.decision === 'approved' ? 'Approved' : 'Rejected'} ${humanizeAction(
              d.action,
            )} · via Prime console`,
            tone: d.decision === 'approved' ? 'success' : 'danger',
          });
        }

        // Agent-specific orchestration seeds keep the trail alive before any
        // real rows exist — staggered hours apart so the merge reads like a
        // day of activity.
        if (items.length < 3) {
          const seeds = profileForName(agentName)?.auditSeeds ?? [];
          const now = Date.now();
          seeds.forEach((text, i) => {
            items.push({
              id: `seed-${agentName}-${i}`,
              at: new Date(now - (i + 1) * 5 * HOUR).toISOString(),
              actor: 'Prime',
              text,
              tone: 'neutral',
            });
          });
        }
      }

      return items
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 8);
    },
  });
}
