import { MMR_PLUGIN_TYPE, resolveMmrEntitlement } from './entitlement';

const other = { type: 'hubspot', status: 'active' };
const mmr = (status?: string) => ({ type: MMR_PLUGIN_TYPE, status });

/**
 * The MMR visibility gate.
 *
 * Worth testing directly because every failure mode here is silent: the screen
 * either appears or it doesn't, and getting it wrong shows a working workspace
 * an empty app with no error to chase.
 */
describe('resolveMmrEntitlement', () => {
  const settled = { isPending: false, isError: false };

  it('enables MMR when the plugin is installed and active', () => {
    expect(resolveMmrEntitlement([other, mmr('active')], settled).enabled).toBe(true);
  });

  it('leaves MMR disabled for a workspace without the plugin', () => {
    expect(resolveMmrEntitlement([other], settled).enabled).toBe(false);
  });

  it('leaves MMR disabled when no integrations are installed at all', () => {
    expect(resolveMmrEntitlement([], settled).enabled).toBe(false);
  });

  describe('statuses', () => {
    it('treats only "disabled" as switched off', () => {
      expect(resolveMmrEntitlement([mmr('disabled')], settled).enabled).toBe(false);
    });

    // A plugin in trouble is still installed. Hiding the screens would hide the
    // problem, and the user would have no way to see that MMR needs attention.
    it.each(['error', 'authentication_required', 'pending_setup'])(
      'keeps MMR visible when the plugin status is %s',
      status => {
        const result = resolveMmrEntitlement([mmr(status)], settled);
        expect(result.enabled).toBe(true);
        expect(result.installedButInactive).toBe(true);
      },
    );

    it('does not flag an active plugin as inactive', () => {
      expect(resolveMmrEntitlement([mmr('active')], settled).installedButInactive).toBe(false);
    });

    it('stays enabled when one of several installs is active', () => {
      const result = resolveMmrEntitlement([mmr('disabled'), mmr('active')], settled);
      expect(result.enabled).toBe(true);
      expect(result.installedButInactive).toBe(false);
    });

    it('tolerates a missing status', () => {
      expect(resolveMmrEntitlement([mmr(undefined)], settled).enabled).toBe(true);
    });
  });

  describe('unresolved states', () => {
    // Callers must branch on these before `enabled`, or the app claims the
    // plugin is missing on every mount and after every network blip.
    it('reports pending without claiming the plugin is absent', () => {
      const result = resolveMmrEntitlement(undefined, { isPending: true, isError: false });
      expect(result.isPending).toBe(true);
      expect(result.enabled).toBe(false);
    });

    it('reports an error without claiming the plugin is absent', () => {
      const result = resolveMmrEntitlement(undefined, { isPending: false, isError: true });
      expect(result.isError).toBe(true);
      expect(result.enabled).toBe(false);
    });
  });
});
