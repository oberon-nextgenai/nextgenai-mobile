import { act, renderHook } from '@testing-library/react-native';
import { useEscalationsStream } from './escalationStreamHooks';
import type { OpenEscalationsStreamOptions } from '@/api/client/escalationsStream';

// The hook follows the live approvals pipeline; these tests run with it on.
jest.mock('@/api/demo/flags', () => ({ APPROVALS_PIPELINE_LIVE: true }));

const mockClose = jest.fn();
const mockOpen = jest.fn();
jest.mock('@/api/client/escalationsStream', () => ({
  openEscalationsStream: (opts: unknown) => mockOpen(opts) as Promise<{ close: () => void }>,
}));

const mockInvalidate = jest.fn();
jest.mock('@/api/hooks/escalationHooks', () => ({
  useInvalidateEscalations: () => mockInvalidate,
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: { token: string | null }) => unknown) =>
    selector({ token: 'jwt' }),
}));

function lastOpenOptions(): OpenEscalationsStreamOptions {
  return mockOpen.mock.calls[mockOpen.mock.calls.length - 1][0] as OpenEscalationsStreamOptions;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockOpen.mockReset().mockResolvedValue({ close: mockClose });
  mockClose.mockReset();
  mockInvalidate.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useEscalationsStream', () => {
  it('opens the org stream and closes it on unmount', async () => {
    const { unmount } = renderHook(() => useEscalationsStream('org-1'));
    await act(async () => {});

    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(lastOpenOptions().organizationId).toBe('org-1');

    unmount();
    expect(mockClose).toHaveBeenCalled();
  });

  it('turns every stream event into an escalations invalidation', async () => {
    renderHook(() => useEscalationsStream('org-1'));
    await act(async () => {});

    act(() => lastOpenOptions().onEvent({ type: 'hitl_approval_created' }));
    act(() => lastOpenOptions().onEvent({ type: 'escalation_created' }));

    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });

  it('reconnects with backoff after an error instead of giving up', async () => {
    renderHook(() => useEscalationsStream('org-1'));
    await act(async () => {});
    expect(mockOpen).toHaveBeenCalledTimes(1);

    act(() => lastOpenOptions().onError?.(new Error('stream dropped')));
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    expect(mockOpen).toHaveBeenCalledTimes(2);
  });

  it('does not stack a second timer when error and close fire together', async () => {
    renderHook(() => useEscalationsStream('org-1'));
    await act(async () => {});

    act(() => {
      lastOpenOptions().onError?.(new Error('stream dropped'));
      lastOpenOptions().onClose?.();
    });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    // One reconnect for the pair, not two.
    expect(mockOpen).toHaveBeenCalledTimes(2);
  });

  it('stays idle without an org', async () => {
    renderHook(() => useEscalationsStream(null));
    await act(async () => {});

    expect(mockOpen).not.toHaveBeenCalled();
  });
});
