import { renderHook } from '@testing-library/react-native';
import { useTabRole } from './useTabRole';
import { useAuthStore } from '@/store/auth';

jest.mock('@/store/auth', () => ({
  useAuthStore: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);

function setUser(user: { role?: string } | null) {
  mockUseAuthStore.mockImplementation(
    ((selector: (s: { user: typeof user }) => unknown) => selector({ user })) as typeof useAuthStore,
  );
}

describe('useTabRole', () => {
  it('reads the role off the signed-in user', () => {
    setUser({ role: 'org_admin' });

    const { result } = renderHook(() => useTabRole());

    expect(result.current).toBe('org_admin');
  });

  it('passes a plain user role through unchanged', () => {
    // If this hook hardcoded or inverted the value, this and the previous
    // case could not both pass.
    setUser({ role: 'user' });

    const { result } = renderHook(() => useTabRole());

    expect(result.current).toBe('user');
  });

  it('returns undefined when there is no signed-in user yet', () => {
    // Before auth resolves — the same "least privilege" case tabsForRole
    // treats as not-allowed.
    setUser(null);

    const { result } = renderHook(() => useTabRole());

    expect(result.current).toBeUndefined();
  });
});
