import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import Toast from 'react-native-toast-message';
import { usePrimeChat } from './chatHooks';
import { openPrimeStream } from '@/api/client/sseClient';
import { fetchAvailableTools, fetchPrimeHistory } from '@/api/services/chat';
import { invalidateForTool } from '@/lib/toolInvalidations';
import { useToolResults } from '@/store/toolResults';
import { useNotifications } from '@/store/notifications';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/api/client/sseClient', () => ({
  openPrimeStream: jest.fn(),
}));

jest.mock('@/api/services/chat', () => ({
  fetchAvailableTools: jest.fn(),
  fetchPrimeHistory: jest.fn(),
}));

jest.mock('@/lib/toolInvalidations', () => ({
  invalidateForTool: jest.fn(),
}));

jest.mock('@/store/toolResults', () => ({
  useToolResults: jest.fn(),
}));

jest.mock('@/store/notifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));

/** Minimal shape of the options `openPrimeStream` is called with — enough to
 * capture and later drive the `onMessage` callback the hook registers. */
interface CapturedStreamOptions {
  onMessage: (data: unknown) => void;
}

const mockOpenPrimeStream = openPrimeStream as unknown as jest.Mock;
const mockFetchAvailableTools = fetchAvailableTools as unknown as jest.Mock;
const mockFetchPrimeHistory = fetchPrimeHistory as unknown as jest.Mock;
const mockInvalidateForTool = invalidateForTool as unknown as jest.Mock;
const mockUseToolResults = useToolResults as unknown as jest.Mock;
const mockUseNotifications = useNotifications as unknown as jest.Mock;
const mockToastShow = Toast.show as unknown as jest.Mock;

const ORG = 'org_1';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

let addToolResult: jest.Mock;
let addNotification: jest.Mock;
let capturedOnMessage: ((data: unknown) => void) | null;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  addToolResult = jest.fn();
  addNotification = jest.fn();
  capturedOnMessage = null;

  mockUseToolResults.mockImplementation((selector: (s: { add: jest.Mock }) => unknown) =>
    selector({ add: addToolResult }),
  );
  mockUseNotifications.mockImplementation((selector: (s: { add: jest.Mock }) => unknown) =>
    selector({ add: addNotification }),
  );
  mockFetchAvailableTools.mockResolvedValue({ tools: [], organizationId: ORG });
  mockFetchPrimeHistory.mockResolvedValue([]);
  mockOpenPrimeStream.mockImplementation((opts: CapturedStreamOptions) => {
    capturedOnMessage = opts.onMessage;
    return Promise.resolve({ close: jest.fn() });
  });
});

afterEach(() => {
  jest.useRealTimers();
});

/** Starts a turn and returns the `onMessage` callback the hook wired up to the stream. */
async function submitAndCaptureStream() {
  const { result } = renderHook(() => usePrimeChat(ORG), { wrapper });
  await act(async () => {
    await result.current.handleSubmit('do something');
  });
  if (!capturedOnMessage) throw new Error('openPrimeStream onMessage was not captured');
  return capturedOnMessage;
}

describe('usePrimeChat — tool_results status derivation', () => {
  it('a stored record for a success:false envelope gets failure status before badges/toasts fire', async () => {
    const onMessage = await submitAndCaptureStream();

    act(() => {
      // No transport-level `error` — this is the shape the API now sends
      // for a refusal: the failure only lives inside `result`. Production
      // wire shape (`{ toolName, toolCallId, arguments, result }`) — see the
      // shape note on the describe block below.
      onMessage({
        type: 'tool_results',
        results: [
          {
            toolCallId: 'call_1',
            toolName: 'create_agent',
            arguments: { name: 'Reception' },
            result: {
              success: false,
              errorCode: 'VALIDATION_ERROR',
              message: 'That name is already taken.',
              retryable: false,
            },
          },
        ],
      });
    });

    // The raw record is still stored as-is (the screen re-derives failure at
    // render time) — what must NOT happen is anything downstream treating
    // this as a success.
    expect(addToolResult).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'call_1', toolName: 'create_agent', error: undefined }),
    );
    expect(addNotification).not.toHaveBeenCalled();
    expect(mockInvalidateForTool).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'create_agent' }),
    );
    expect(mockToastShow).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));

    mockToastShow.mockClear();
    act(() => {
      onMessage({ type: 'complete', message: { content: 'done' } });
    });
    // No tool succeeded this turn, so the batched end-of-turn summary toast
    // must never fire either.
    expect(mockToastShow).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('a NOT_FOUND miss carried the same way is also a failure, not a success', async () => {
    const onMessage = await submitAndCaptureStream();

    act(() => {
      onMessage({
        type: 'tool_results',
        results: [
          {
            toolCallId: 'call_4',
            toolName: 'update_agent',
            arguments: { agentId: 'agent_missing' },
            result: { success: false, errorCode: 'NOT_FOUND', message: 'Agent not found.' },
          },
        ],
      });
    });

    expect(addNotification).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'update_agent' }),
    );
  });

  it('transport error behaviour unchanged', async () => {
    // Deliberately the one legacy `{id, name, error}` fixture left in this
    // describe block — production's `tool_results` shape carries neither
    // `id`/`name` nor a top-level `error` (see the shape note below), so
    // this pins the `r.id ?? genId()` / `r.name ?? 'tool'` / `Boolean(r.error)`
    // fallback path for any sender that still uses it.
    const onMessage = await submitAndCaptureStream();

    act(() => {
      onMessage({
        type: 'tool_results',
        results: [{ id: 'call_2', name: 'send_email', error: 'Timed out' }],
      });
    });

    expect(addToolResult).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'call_2', toolName: 'send_email', error: 'Timed out' }),
    );
    expect(addNotification).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'send_email' }),
    );
  });

  it('a genuine success still notifies immediately and batches into the end-of-turn toast', async () => {
    const onMessage = await submitAndCaptureStream();

    act(() => {
      onMessage({
        type: 'tool_results',
        results: [
          {
            toolCallId: 'call_3',
            toolName: 'list_agents',
            arguments: {},
            result: { success: true, data: [] },
          },
        ],
      });
    });

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Prime ran list_agents' }),
    );
    expect(mockInvalidateForTool).toHaveBeenCalledWith(
      expect.anything(),
      'list_agents',
      ORG,
    );
    // Successes are batched — no immediate toast per tool.
    expect(mockToastShow).not.toHaveBeenCalled();

    act(() => {
      onMessage({ type: 'complete', message: { content: 'done' } });
    });

    expect(mockToastShow).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});

/**
 * The backend's actual `tool_results` wire shape (`ToolCallResult` in
 * chat.types.ts, written by chat.service.ts's `executeToolCalls`) is
 * `{ toolName, toolCallId, arguments, result }` — there is no `id` and no
 * `error` field. `toolCallId` is the same OpenAI streaming tool-call id
 * `ToolCallBadge` navigates with (`router.push('/tool-result/${tool.id}')`,
 * sourced from the `tool_call` delta merge). If the stored record keyed
 * itself off anything else, a badge tap would never find its result and
 * would fall through to the not-found/audit-fallback screen instead.
 */
describe('usePrimeChat — tool_results record id linkage', () => {
  it('keys the stored record by the payload\'s toolCallId — what badge navigation uses', async () => {
    const onMessage = await submitAndCaptureStream();

    act(() => {
      onMessage({
        type: 'tool_results',
        results: [
          {
            toolName: 'create_agent',
            toolCallId: 'call_abc123',
            arguments: { name: 'Reception' },
            result: { success: true, data: { id: 'agent_1' } },
          },
        ],
      });
    });

    expect(addToolResult).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'call_abc123', toolName: 'create_agent' }),
    );
  });

  it('falls back to a generated id only when both toolCallId and id are absent', async () => {
    const onMessage = await submitAndCaptureStream();

    act(() => {
      onMessage({
        type: 'tool_results',
        results: [{ toolName: 'create_agent', arguments: {}, result: { success: true } }],
      });
    });

    expect(addToolResult).toHaveBeenCalledTimes(1);
    const stored = addToolResult.mock.calls[0][0] as { id: string; toolName: string };
    expect(stored.toolName).toBe('create_agent');
    // No toolCallId, no id on the payload — the store still needs a key,
    // so genId() fills the gap. Just prove it's non-empty and not
    // accidentally reusing the tool name.
    expect(stored.id).toBeTruthy();
    expect(stored.id).not.toBe('create_agent');
  });
});
