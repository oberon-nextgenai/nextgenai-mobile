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
 *
 * Two different writers feed the same `auditlogs` collection this endpoint
 * reads, and they do not share a schema:
 *  - The global Mongoose audit plugin (model-level create/update/delete) writes
 *    `collectionName` / `documentId` / `operation` / `before` / `after` /
 *    `userEmail` / `endpoint` / `ip` — the fields this DTO originally modelled.
 *  - `McpService.stampAudit` (`src/modules/mcp/mcp.service.ts`) — one row per
 *    *mutating* Prime tool call, not every tool call — writes a disjoint shape
 *    instead: `action` (`"prime.<toolName>"`) and `details: { source: 'prime',
 *    payload }`, where `payload` is whatever hand-picked identifiers/arguments
 *    that call chose to log (e.g. `{ campaignId }`), never the tool's return
 *    value. Mongoose has no schema-on-read, so a `prime.*` row comes back with
 *    `collectionName`/`documentId`/`operation`/etc. simply absent and
 *    `action`/`details` present — hence both groups below are optional.
 */

export type AuditOperation = 'create' | 'update' | 'delete';

export interface AuditLogEntry {
  _id: string;
  organizationId?: string;
  /** Model name, e.g. `Agent`, `Escalation`. Absent on `prime.*` rows. */
  collectionName?: string;
  documentId?: string;
  operation?: AuditOperation;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  userId: string;
  userEmail?: string;
  /** The route that caused the change. Absent on `prime.*` rows. */
  endpoint?: string;
  ip?: string;
  createdAt: string;
  /** Present only on Prime-stamped rows — `"prime.<toolName>"`. */
  action?: string;
  /** Present only on Prime-stamped rows. `payload` is call metadata, never the tool's result. */
  details?: { source?: string; payload?: Record<string, unknown> };
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
