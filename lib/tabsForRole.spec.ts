import { canSeeApprovals, tabsForRole } from './tabsForRole';

const TABS = [
  { name: 'brief' },
  { name: 'workforce' },
  { name: 'prime' },
  { name: 'approvals' },
  { name: 'more' },
] as const;

const names = (role: Parameters<typeof canSeeApprovals>[0]) =>
  tabsForRole(TABS, role).map((t) => t.name);

describe('tabsForRole', () => {
  it('hides Approvals from a plain user', () => {
    // The backend 403s every escalations route for this role, and the badge
    // poll would toast on each failure.
    expect(canSeeApprovals('user')).toBe(false);
    expect(names('user')).toEqual(['brief', 'workforce', 'prime', 'more']);
  });

  it('shows Approvals to org admins and superadmins', () => {
    for (const role of ['org_admin', 'superadmin'] as const) {
      expect(canSeeApprovals(role)).toBe(true);
      expect(names(role)).toContain('approvals');
    }
  });

  it('hides Approvals when the role is not yet known', () => {
    // Before auth resolves, assume the least privilege — showing the tab and
    // retracting it is worse than showing it a moment late.
    expect(canSeeApprovals(undefined)).toBe(false);
    expect(names(undefined)).not.toContain('approvals');
  });

  it('leaves every other tab alone for every role', () => {
    for (const role of ['user', 'org_admin', 'superadmin', undefined] as const) {
      expect(names(role)).toEqual(expect.arrayContaining(['brief', 'workforce', 'prime', 'more']));
    }
  });
});
