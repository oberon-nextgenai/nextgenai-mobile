import { render, screen } from '@testing-library/react-native';
import { CustomTabBar, type TabBarProps } from '@/app/(root)/(tabs)/_layout';
import { useTabRole } from '@/hooks/useTabRole';
import { useActiveOrg } from '@/store/org';
import { useEscalationCounts } from '@/api/hooks/escalationHooks';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/useTabRole', () => ({ useTabRole: jest.fn() }));
jest.mock('@/store/org', () => ({ useActiveOrg: jest.fn() }));
jest.mock('@/api/hooks/escalationHooks', () => ({ useEscalationCounts: jest.fn() }));

const mockUseTabRole = jest.mocked(useTabRole);
const mockUseActiveOrg = jest.mocked(useActiveOrg);
const mockUseEscalationCounts = jest.mocked(useEscalationCounts);

const ORG = 'org_1';

/**
 * `CustomTabBar` reads only `state` and `navigation` off `BottomTabBarProps`
 * — never `descriptors` — so a minimal stub renders it without mounting the
 * real `<Tabs>` navigator underneath. Empty `routes` is fine because none of
 * these tests press a tab (that would need `state.routes` to contain a
 * matching route for `onPress` to emit against).
 */
const stubProps = {
  state: { index: 0, routes: [] },
  navigation: { emit: () => ({}), navigate: () => {} },
} as unknown as TabBarProps;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseActiveOrg.mockReturnValue({ activeOrgId: ORG, active: null, organizations: [] });
  mockUseEscalationCounts.mockReturnValue({
    data: undefined,
  } as unknown as ReturnType<typeof useEscalationCounts>);
});

/**
 * ND-1353 made the escalations queue org_admin/superadmin-only server-side.
 * This tab bar is the original bug and the primary surface: it used to
 * render Approvals to every role and poll its badge (`useEscalationCounts`)
 * from every screen, so a plain `user` collected a 403 and an "Access
 * denied" toast on every ~20s poll. The other two call sites — the More
 * menu (`more/index.tsx`) and the Approvals screen itself
 * (`approvals/index.tsx`, deliberately left ungated, deep-link-only) — have
 * their own coverage; this is the one the governing spec asked to be
 * exercised by rendering the real component, not a pure-module stand-in.
 */
describe('CustomTabBar — Approvals gating for non-admins', () => {
  it('hides the Approvals tab and disables its badge poll for a plain user', () => {
    mockUseTabRole.mockReturnValue('user');

    render(<CustomTabBar {...stubProps} />);

    expect(screen.queryByText('Approvals')).toBeNull();
    expect(mockUseEscalationCounts).toHaveBeenCalledWith(null);
  });

  it('hides the Approvals tab and disables its badge poll when the role is not yet known', () => {
    mockUseTabRole.mockReturnValue(undefined);

    render(<CustomTabBar {...stubProps} />);

    expect(screen.queryByText('Approvals')).toBeNull();
    expect(mockUseEscalationCounts).toHaveBeenCalledWith(null);
  });

  it('shows the Approvals tab and polls with the real org id for an org admin', () => {
    mockUseTabRole.mockReturnValue('org_admin');

    render(<CustomTabBar {...stubProps} />);

    expect(screen.getByText('Approvals')).toBeTruthy();
    expect(mockUseEscalationCounts).toHaveBeenCalledWith(ORG);
  });

  it('shows the Approvals tab and polls with the real org id for a superadmin', () => {
    mockUseTabRole.mockReturnValue('superadmin');

    render(<CustomTabBar {...stubProps} />);

    expect(screen.getByText('Approvals')).toBeTruthy();
    expect(mockUseEscalationCounts).toHaveBeenCalledWith(ORG);
  });

  it('leaves every other tab in place for a plain user — the bar hides Approvals, nothing else', () => {
    mockUseTabRole.mockReturnValue('user');

    render(<CustomTabBar {...stubProps} />);

    expect(screen.getByText('Brief')).toBeTruthy();
    expect(screen.getByText('Workforce')).toBeTruthy();
    expect(screen.getByText('Prime')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });
});
