import { canSeeApprovals, tabsForRole } from './tabsForRole';

/**
 * This fixture is deliberately NOT a copy of the production tab list in
 * `_layout.tsx` — that's the bug this file used to have. `tabsForRole` reads
 * a descriptor's `adminOnly` flag, not its `name`, so the fixture only needs
 * to exercise that flag: one tab carries it, the rest don't, and the tab
 * that carries it is not named `'approvals'`. If the implementation ever
 * regresses to matching the literal string `'approvals'` instead of the
 * flag, the tests below fail — renaming the real route, or flagging a
 * differently-named tab, can no longer slip past this spec unnoticed.
 */
type Tab = { name: string; adminOnly?: boolean };

const TABS: Tab[] = [
  { name: 'brief' },
  { name: 'workforce' },
  { name: 'prime' },
  { name: 'gated', adminOnly: true },
  { name: 'more' },
];

const names = (role: Parameters<typeof canSeeApprovals>[0]) =>
  tabsForRole(TABS, role).map((t) => t.name);

describe('tabsForRole', () => {
  it('hides the admin-only tab from a plain user', () => {
    // The backend 403s every escalations route for this role, and the badge
    // poll would toast on each failure.
    expect(canSeeApprovals('user')).toBe(false);
    expect(names('user')).toEqual(['brief', 'workforce', 'prime', 'more']);
  });

  it('shows the admin-only tab to org admins and superadmins', () => {
    for (const role of ['org_admin', 'superadmin'] as const) {
      expect(canSeeApprovals(role)).toBe(true);
      expect(names(role)).toContain('gated');
    }
  });

  it('hides the admin-only tab when the role is not yet known', () => {
    // Before auth resolves, assume the least privilege — showing the tab and
    // retracting it is worse than showing it a moment late.
    expect(canSeeApprovals(undefined)).toBe(false);
    expect(names(undefined)).not.toContain('gated');
  });

  it('leaves every other tab alone for every role', () => {
    for (const role of ['user', 'org_admin', 'superadmin', undefined] as const) {
      expect(names(role)).toEqual(expect.arrayContaining(['brief', 'workforce', 'prime', 'more']));
    }
  });

  it('gates on the adminOnly flag, not on a tab named "approvals"', () => {
    // Proves the rule is data-driven: a tab named 'approvals' with no flag
    // stays visible, and a flagged tab named something else is hidden — the
    // opposite of what a name-keyed rule would do. This is what would have
    // caught the original bug: renaming the route, or flagging a second
    // admin-only tab, cannot silently fail open here the way it could when
    // the rule matched on `tab.name !== 'approvals'`.
    const mixed: Tab[] = [{ name: 'zzz', adminOnly: true }, { name: 'approvals' }];
    expect(tabsForRole(mixed, 'user').map((t) => t.name)).toEqual(['approvals']);
    expect(tabsForRole(mixed, 'org_admin').map((t) => t.name)).toEqual(['zzz', 'approvals']);
  });
});
