import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';

/**
 * Audit trail reads.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/audit-log`. Requires `org_admin` or
 * above — a plain member gets 403.
 *
 * Rows written before the backend gained `organizationId` have none, and the API
 * excludes them from every tenant-scoped read rather than showing them to
 * everyone. Until the backfill script has run, history will look thinner than the
 * database actually is; that is deliberate, not a bug.
 */

export type AuditOperation = 'create' | 'update' | 'delete';

export interface AuditLogEntry {
  _id: string;
  organizationId?: string;
  /** Model name, e.g. `Agent`, `Escalation`. */
  collectionName: string;
  documentId: string;
  operation: AuditOperation;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  userId: string;
  userEmail: string;
  /** The route that caused the change. */
  endpoint: string;
  ip: string;
  createdAt: string;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  /** Opaque cursor. Null on the last page. */
  nextCursor: string | null;
}

export interface ListAuditLogParams {
  organizationId: string;
  collectionName?: string;
  /** Restrict to one record's history — powers "show me this agent's changes". */
  documentId?: string;
  userId?: string;
  operation?: AuditOperation;
  /** Inclusive lower bound, ISO 8601. */
  from?: string;
  /** Exclusive upper bound, ISO 8601. */
  to?: string;
  cursor?: string;
  limit?: number;
}

export async function fetchAuditLog(params: ListAuditLogParams): Promise<AuditLogPage> {
  const { data } = await http.get<AuditLogPage>(PATHS.auditLog.list, { params });
  return data;
}
