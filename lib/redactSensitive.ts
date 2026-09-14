/**
 * Recursive display-time redaction for tool-approval payloads.
 *
 * The API already redacts `actionPayload` before it leaves the server
 * (`hitl-grants.service.ts` → `sanitizeApprovalForClient`); this is the belt on
 * top — the decide screen must never render a credential even if a server-side
 * gap ships. The key pattern mirrors the backend's `SENSITIVE_KEY_PATTERN`.
 */

const SENSITIVE_KEY_RE =
  /pass(word)?|token|secret|api[-_]?key|access[-_]?key|private[-_]?key|auth(orization)?|bearer|credential|cookie|session/i;

const PLACEHOLDER = '[REDACTED]';

/** Bounded so a hostile payload cannot recurse the UI thread to death. */
const MAX_DEPTH = 6;

export function redactSensitiveDeep(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return PLACEHOLDER;

  if (Array.isArray(value)) {
    return value.map(item => redactSensitiveDeep(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? PLACEHOLDER : redactSensitiveDeep(child, depth + 1);
    }
    return out;
  }

  return value;
}
