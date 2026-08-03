import { render, screen } from '@testing-library/react-native';
import ToolResultScreen from './[id]';
import { useToolResults } from '@/store/toolResults';
import type { ToolResultRecord } from '@/store/toolResults';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useActiveOrg } from '@/store/org';
import { useAuditLogList } from '@/api/hooks/auditHooks';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/store/toolResults', () => ({
  useToolResults: jest.fn(),
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/store/org', () => ({
  useActiveOrg: jest.fn(),
}));

// The audit-trail fallback only matters when there is no local record at all;
// every case here has one, so the hook is stubbed to a harmless idle result
// rather than requiring a real QueryClientProvider in the tree.
jest.mock('@/api/hooks/auditHooks', () => ({
  useAuditLogList: jest.fn(),
}));

const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
const mockUseToolResults = jest.mocked(useToolResults);
const mockUseAuthStore = jest.mocked(useAuthStore);
const mockUseActiveOrg = jest.mocked(useActiveOrg);
const mockUseAuditLogList = jest.mocked(useAuditLogList);

function setRecord(record: ToolResultRecord) {
  mockUseToolResults.mockImplementation(
    ((selector: (s: { byId: Record<string, ToolResultRecord> }) => unknown) =>
      selector({ byId: { [record.id]: record } })) as typeof useToolResults,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'call_1' } as ReturnType<
    typeof useLocalSearchParams
  >);
  mockUseAuthStore.mockImplementation(
    ((selector: (s: { user: unknown }) => unknown) =>
      selector({ user: { _id: 'u1', role: 'user' } })) as typeof useAuthStore,
  );
  mockUseActiveOrg.mockReturnValue({ activeOrgId: 'org_1', active: null, organizations: [] });
  mockUseAuditLogList.mockReturnValue({
    entries: [],
    isSuccess: false,
    isLoading: false,
  } as unknown as ReturnType<typeof useAuditLogList>);
});

describe('ToolResultScreen — success/failure treatment', () => {
  it('shows Success for a genuinely successful tool call', () => {
    setRecord({
      id: 'call_1',
      toolName: 'create_agent',
      result: { success: true, data: { id: 'agent_1' } },
      createdAt: Date.now(),
    });

    render(<ToolResultScreen />);

    expect(screen.getByText('Success')).toBeTruthy();
    expect(screen.queryByText('Failed')).toBeNull();
  });

  // The screenshotted regression: the API returns tool failures as payloads —
  // `{ success: false, errorCode, message, retryable }` — often with no
  // transport-level error at all, and `Boolean(record.error)` alone missed it.
  it('shows the error treatment for a success:false payload without a transport error', () => {
    setRecord({
      id: 'call_1',
      toolName: 'create_agent',
      result: {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'That name is already taken.',
        retryable: false,
      },
      createdAt: Date.now(),
    });

    render(<ToolResultScreen />);

    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.queryByText('Success')).toBeNull();
  });

  it('shows the error treatment for a NOT_FOUND miss carried the same way', () => {
    setRecord({
      id: 'call_1',
      toolName: 'update_agent',
      result: { success: false, errorCode: 'NOT_FOUND', message: 'Agent not found.' },
      createdAt: Date.now(),
    });

    render(<ToolResultScreen />);

    expect(screen.getByText('Failed')).toBeTruthy();
  });

  it('still shows the error treatment for a genuine transport-level error, unchanged', () => {
    setRecord({
      id: 'call_1',
      toolName: 'create_agent',
      error: 'Request timed out',
      createdAt: Date.now(),
    });

    render(<ToolResultScreen />);

    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.queryByText('Success')).toBeNull();
  });
});
