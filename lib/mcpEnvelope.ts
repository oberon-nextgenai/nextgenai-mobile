/**
 * MCP tool failures increasingly arrive as *payloads* rather than transport
 * errors — `{ success: false, errorCode, message, retryable, ... }` — with no
 * `error` set anywhere on the SSE `tool_results` envelope or the stored
 * result record. Every surface that decides "did this tool call succeed"
 * (chat badges/toasts/notifications, the tool-result screen) must run the
 * raw result through this predicate instead of trusting an `error` field
 * alone, or a refusal (`VALIDATION_ERROR`) / miss (`NOT_FOUND`) renders as a
 * green success.
 */

/** The subset of a tool-result payload this predicate cares about. */
interface EnvelopeShape {
  success?: unknown;
  errorCode?: unknown;
}

/**
 * True when `result` — once parsed — is an object carrying `success: false`
 * or a non-empty `errorCode`. False for `null`/`undefined`/primitives, for a
 * success envelope, and for a string that fails to parse as JSON.
 *
 * Records sometimes hold the raw JSON string (persisted, or replayed) rather
 * than an already-parsed object, so a string input is `JSON.parse`d inside a
 * try/catch — a malformed string is treated as "not a failure envelope"
 * rather than thrown.
 */
export function isEnvelopeFailure(result: unknown): boolean {
  const payload = typeof result === 'string' ? safeParseJson(result) : result;

  if (payload === null || typeof payload !== 'object') return false;

  const envelope = payload as EnvelopeShape;
  if (envelope.success === false) return true;

  return typeof envelope.errorCode === 'string' && envelope.errorCode.trim().length > 0;
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
