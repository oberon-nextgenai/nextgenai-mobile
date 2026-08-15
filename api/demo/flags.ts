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
