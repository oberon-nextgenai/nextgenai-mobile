/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * This flag exists only on the `demo/toshiba-board` branch. It routes the
 * escalations service to local fixtures and fills missing metrics so the
 * Toshiba board presentation flows without a seeded backend. Delete the
 * `api/demo/` directory, `store/demoOverrides.ts`, and every call site that
 * references them after the presentation.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Typed as `boolean` (not `true`) so guarded real code paths stay reachable. */
export const DEMO_APPROVALS: boolean = true;

/**
 * Runs the REAL approvals pipeline alongside the fixture deck: real escalations
 * (e.g. Sophie's HITL tool approvals) merge into the same list/badge/counts,
 * web push + the SSE live stream turn on, and real ids hit the API while
 * `demo-*` ids stay fixture-served. The rest of the demo presentation (Brief,
 * More menu, Prime scrubbing, workforce ledger) is untouched — this flag is
 * "placeholders + live approvals", not "go fully live".
 */
export const LIVE_APPROVALS_OVERLAY: boolean = true;

/**
 * Whether the live escalations transport (real API calls, web push
 * registration, SSE stream) should be active. True outside the demo entirely,
 * or inside it when the overlay is on.
 */
export const APPROVALS_PIPELINE_LIVE: boolean = !DEMO_APPROVALS || LIVE_APPROVALS_OVERLAY;
