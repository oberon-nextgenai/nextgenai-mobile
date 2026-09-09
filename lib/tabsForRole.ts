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

export function tabsForRole<T extends { name: string }>(tabs: readonly T[], role: TabRole): T[] {
  const allowed = canSeeApprovals(role);
  return tabs.filter((tab) => tab.name !== 'approvals' || allowed);
}
