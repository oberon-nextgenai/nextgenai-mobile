import { render, screen } from '@testing-library/react-native';
import MoreScreen from '@/app/(root)/(tabs)/more/index';
import { useAuthStore } from '@/store/auth';
import { useTabRole } from '@/hooks/useTabRole';
import { useActiveOrg } from '@/store/org';
import { useNotifications } from '@/store/notifications';
import { useEscalationCounts } from '@/api/hooks/escalationHooks';
import { useWorkforce } from '@/api/hooks/executiveHooks';
import { useDashboard } from '@/api/hooks/analyticsHooks';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => false,
  }),
  useNavigation: () => ({ getParent: () => undefined }),
  useFocusEffect: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/store/auth', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useTabRole', () => ({ useTabRole: jest.fn() }));
jest.mock('@/store/org', () => ({ useActiveOrg: jest.fn() }));
jest.mock('@/store/notifications', () => ({ useNotifications: jest.fn() }));
jest.mock('@/api/hooks/escalationHooks', () => ({ useEscalationCounts: jest.fn() }));
jest.mock('@/api/hooks/executiveHooks', () => ({ useWorkforce: jest.fn() }));
jest.mock('@/api/hooks/analyticsHooks', () => ({ useDashboard: jest.fn() }));

const mockUseAuthStore = jest.mocked(useAuthStore);
const mockUseTabRole = jest.mocked(useTabRole);
const mockUseActiveOrg = jest.mocked(useActiveOrg);
const mockUseNotifications = jest.mocked(useNotifications);
const mockUseEscalationCounts = jest.mocked(useEscalationCounts);
const mockUseWorkforce = jest.mocked(useWorkforce);
const mockUseDashboard = jest.mocked(useDashboard);

const ORG = 'org_1';

function setRole(role: 'user' | 'org_admin' | 'superadmin' | undefined) {
  mockUseTabRole.mockReturnValue(role);
}

beforeEach(() => {
  jest.clearAllMocks();

  // `user.role` is intentionally pinned to 'org_admin' here while `setRole()`
  // (below) drives the gate independently via the mocked `useTabRole`. That
  // divergence is load-bearing, not an inconsistency to "clean up": it's what
  // proves the Approvals gating in this screen reads `useTabRole`, not
  // `user.role` — `user.role` is only ever used for the `affiliation` display
  // string. Making the two agree would let a regression that reads the wrong
  // source pass every test in this file unnoticed.
  mockUseAuthStore.mockImplementation(
    ((selector: (s: { user: unknown }) => unknown) =>
      selector({
        user: { name: 'Sara Chen', email: 'sara@acme.test', role: 'org_admin' },
      })) as typeof useAuthStore,
  );
  mockUseActiveOrg.mockReturnValue({ activeOrgId: ORG, active: null, organizations: [] });
  mockUseNotifications.mockImplementation(
    ((selector: (s: { unreadCount: () => number }) => unknown) =>
      selector({ unreadCount: () => 0 })) as typeof useNotifications,
  );
  mockUseEscalationCounts.mockReturnValue({
    data: undefined,
  } as unknown as ReturnType<typeof useEscalationCounts>);
  mockUseWorkforce.mockReturnValue({
    isPending: false,
    isError: false,
    summary: { total: 4, healthy: 4, attention: 0, paused: 0, critical: 0 },
  } as unknown as ReturnType<typeof useWorkforce>);
  mockUseDashboard.mockReturnValue({
    data: undefined,
  } as unknown as ReturnType<typeof useDashboard>);
});

describe('MoreScreen — Approvals gating for non-admins', () => {
  // ND-1353 made the escalations queue org_admin/superadmin-only server-side.
  // This is the second of three call sites (see `_layout.tsx` for the first,
  // `approvals/index.tsx` for the third, deliberately-ungated one): the menu
  // reads the same counts to show a live badge on its own Approvals row.
  it('disables the escalation-count poll for a plain user', () => {
    setRole('user');

    render(<MoreScreen />);

    expect(mockUseEscalationCounts).toHaveBeenCalledWith(null);
  });

  it('hides both Approvals rows for a plain user', () => {
    setRole('user');

    render(<MoreScreen />);

    expect(screen.queryByText('Approvals')).toBeNull();
    expect(screen.queryByText('Approvals & audit')).toBeNull();
  });

  it('hides both Approvals rows when the role is not yet known', () => {
    setRole(undefined);

    render(<MoreScreen />);

    expect(screen.queryByText('Approvals')).toBeNull();
    expect(screen.queryByText('Approvals & audit')).toBeNull();
  });

  it('polls with the real org id for an org admin', () => {
    setRole('org_admin');

    render(<MoreScreen />);

    expect(mockUseEscalationCounts).toHaveBeenCalledWith(ORG);
  });

  it('shows both Approvals rows for an org admin', () => {
    setRole('org_admin');

    render(<MoreScreen />);

    expect(screen.getByText('Approvals')).toBeTruthy();
    expect(screen.getByText('Approvals & audit')).toBeTruthy();
  });

  it('shows both Approvals rows for a superadmin', () => {
    setRole('superadmin');

    render(<MoreScreen />);

    expect(screen.getByText('Approvals')).toBeTruthy();
    expect(screen.getByText('Approvals & audit')).toBeTruthy();
  });

  it('leaves every other row in place for a plain user — no stray divider or empty section', () => {
    setRole('user');

    render(<MoreScreen />);

    expect(screen.getByText('Brief')).toBeTruthy();
    expect(screen.getByText('Prime Command')).toBeTruthy();
    expect(screen.getByText('AI Workforce')).toBeTruthy();
    expect(screen.getByText('Security')).toBeTruthy();
    expect(screen.getByText('Organization')).toBeTruthy();
  });
});
