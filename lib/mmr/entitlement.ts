/** The plugin type that gates MMR (`templates/mmr-campaigns.plugin.ts`). */
export const MMR_PLUGIN_TYPE = 'mmr-campaigns';

/** Just enough of `Integration` to decide entitlement. */
export interface EntitlementIntegration {
  type: string;
  status?: string;
}

export interface MmrEntitlement {
  /** True once we know the workspace has the plugin. False while loading. */
  enabled: boolean;
  /** Still resolving — render a skeleton rather than the not-installed state. */
  isPending: boolean;
  /** The lookup failed. Distinct from "not installed": don't claim either way. */
  isError: boolean;
  /** Installed but nothing active — disabled elsewhere, or awaiting re-auth. */
  installedButInactive: boolean;
}

/**
 * Whether a workspace may see MMR features on mobile.
 *
 * Split out as a pure function because the interesting behaviour is entirely in
 * the status handling, and that is worth testing without a React tree.
 *
 * Three things this deliberately gets right:
 *
 * - **Loading is not absence.** `enabled` stays false while pending, but
 *   callers must branch on `isPending` first, or every screen flashes
 *   "not installed" on mount.
 * - **An error is not absence either.** A failed integrations lookup must not
 *   be reported as a missing plugin — that sends someone to install what they
 *   already have.
 * - **Only `disabled` counts as off.** `error`, `authentication_required` and
 *   `pending_setup` are an installed plugin having a bad day. Hiding the
 *   screens then would conceal the very problem the user needs to see.
 */
export function resolveMmrEntitlement(
  integrations: EntitlementIntegration[] | undefined,
  flags: { isPending: boolean; isError: boolean },
): MmrEntitlement {
  const installed = (integrations ?? []).filter(i => i.type === MMR_PLUGIN_TYPE);
  const usable = installed.filter(i => i.status !== 'disabled');

  return {
    enabled: usable.length > 0,
    isPending: flags.isPending,
    isError: flags.isError,
    installedButInactive: usable.length > 0 && !usable.some(i => i.status === 'active'),
  };
}
