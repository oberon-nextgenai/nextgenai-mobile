/**
 * Which bottom tabs a role may see.
 *
 * ND-1353 made every escalations route `org_admin`/`superadmin`-only server
 * side. The bar previously rendered Approvals to everyone and polled its badge
 * from every screen, so a plain `user` collected a 403 per poll and an
 * "Access denied" toast with each one.
 *
 * Kept as a pure module — no React, no hooks — because the tab bar itself
 * needs navigator state to render, which would otherwise leave this rule
 * untested.
 */
export type TabRole = 'user' | 'org_admin' | 'superadmin' | undefined;

/** Mirrors `hitlGrants.assertOrgAdmin` on the backend. */
export function canSeeApprovals(role: TabRole): boolean {
  return role === 'org_admin' || role === 'superadmin';
}

/**
 * Filters a tab descriptor list for a role.
 *
 * Keyed off the descriptor's own `adminOnly` flag rather than a tab's
 * `name` — a rule keyed on the literal string `'approvals'` would silently
 * stop applying the moment the route were renamed, or would silently apply
 * to an unrelated tab that happened to be named `'approvals'`, and neither
 * TypeScript nor this rule's own spec would notice: the spec would keep
 * passing against its own hand-copied fixture while the real bar failed
 * open. Reading `adminOnly` off the same object the bar renders from makes
 * the fixture and the production list structurally the same shape, so a
 * rename or a reordering can't desync them.
 */
export function tabsForRole<T extends { adminOnly?: boolean }>(
  tabs: readonly T[],
  role: TabRole,
): T[] {
  const allowed = canSeeApprovals(role);
  return tabs.filter((tab) => !tab.adminOnly || allowed);
}
