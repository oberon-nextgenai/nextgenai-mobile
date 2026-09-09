import { useAuthStore } from '@/store/auth';
import type { TabRole } from '@/lib/tabsForRole';

/**
 * The signed-in user's role, typed for the tab-visibility rules in
 * `@/lib/tabsForRole`.
 *
 * `PublicUser.role` is declared `'superadmin' | 'org_admin' | 'user' | string`
 * — the trailing `| string` keeps the field open for roles the client doesn't
 * know about yet — which TypeScript widens to plain `string` for assignability.
 * This hook is the one place that asserts past that looseness back to
 * `TabRole`, so every consumer of the Approvals-gating rule reads a value
 * `canSeeApprovals`/`tabsForRole` can actually accept, without each call site
 * repeating its own cast.
 */
export function useTabRole(): TabRole {
  return useAuthStore((s) => s.user?.role) as TabRole;
}
