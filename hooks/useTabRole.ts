import { useAuthStore } from '@/store/auth';
import type { TabRole } from '@/lib/tabsForRole';

/**
 * The signed-in user's role, typed for the tab-visibility rules in
 * `@/lib/tabsForRole`.
 *
 * `PublicUser.role` is declared `'superadmin' | 'org_admin' | 'user' | string`
 * — the trailing `| string` keeps the field open for roles the client doesn't
 * know about yet — which TypeScript widens to plain `string` for assignability.
 * This hook is the one place that narrows back down to `TabRole`, so every
 * consumer of the Approvals-gating rule reads a value `canSeeApprovals`/
 * `tabsForRole` can actually accept, without each call site repeating its own
 * cast. A real narrowing (rather than `as TabRole`) means an unrecognised role
 * string can't silently masquerade as a member of `TabRole` — it falls through
 * to `undefined`, the same "not yet known" value `tabsForRole` already treats
 * as least-privilege, so an unknown role is denied rather than trusted.
 */
export function useTabRole(): TabRole {
  const role = useAuthStore((s) => s.user?.role);
  return role === 'org_admin' || role === 'superadmin' || role === 'user' ? role : undefined;
}
