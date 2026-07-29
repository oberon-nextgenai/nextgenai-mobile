import type { AuditLogEntry } from '@/api/services/audit';

/**
 * How far from the tool call's own timestamp an audit row may sit and still
 * be considered "this call" rather than some other call to the same tool.
 * `stampAudit` writes its row right after the tool delegate succeeds, so the
 * two timestamps should be within seconds of each other in practice — this
 * window is generous padding for clock skew and slow requests, not an
 * attempt to be clever about matching.
 */
export const AUDIT_FALLBACK_WINDOW_MS = 10 * 60_000;

/**
 * Finds the audit row that most plausibly corresponds to one specific Prime
 * tool call, given only the tool's name and roughly when it ran.
 *
 * There is no shared identifier between a client-side tool-result id and an
 * audit row's `_id` — `stampAudit` never learns the client id, and the client
 * never learns the audit row's id. So this is a best-effort match on
 * `action === "prime.<toolName>"` plus closest `createdAt`, not a lookup. It
 * can find the wrong row if the same tool ran twice for the same user inside
 * the window, and it finds nothing at all for the many Prime tools that never
 * call `stampAudit` (read-only queries aren't audited — see mcp.service.ts).
 */
export function findAuditFallback(
  entries: AuditLogEntry[],
  toolName: string,
  atMs: number,
): AuditLogEntry | null {
  const action = `prime.${toolName}`;
  let best: AuditLogEntry | null = null;
  let bestDelta = Infinity;

  for (const entry of entries) {
    if (entry.action !== action) continue;
    const delta = Math.abs(new Date(entry.createdAt).getTime() - atMs);
    if (!Number.isFinite(delta) || delta > AUDIT_FALLBACK_WINDOW_MS) continue;
    if (delta < bestDelta) {
      best = entry;
      bestDelta = delta;
    }
  }

  return best;
}
