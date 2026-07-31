import { renderHook } from '@testing-library/react-native';
import { useDailyBrief } from './executiveHooks';
import { useDashboard, useAgentsAnalytics } from './analyticsHooks';
import { useAgentsList } from './agentHooks';
import type { Agent, AnalyticsAgentRow, AnalyticsMetric } from '@/api/services/types';

jest.mock('./analyticsHooks', () => ({
  useDashboard: jest.fn(),
  useAgentsAnalytics: jest.fn(),
}));

jest.mock('./agentHooks', () => ({
  useAgentsList: jest.fn(),
}));

jest.mock('@/store/notifications', () => ({
  useNotifications: (selector: (s: unknown) => unknown) =>
    selector({ items: [], unreadCount: () => 0 }),
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { name: 'Sara Chen' } }),
}));

const mockDashboard = jest.mocked(useDashboard);
const mockAgentsAnalytics = jest.mocked(useAgentsAnalytics);
const mockAgentsList = jest.mocked(useAgentsList);

const ORG = 'org_1';

/** Minimal stand-in for the parts of a React Query result these hooks read. */
function queryResult<T>(data: T | undefined) {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: jest.fn(),
  };
}

function agent(overrides: Partial<Agent> & { _id: string; name: string }): Agent {
  return { type: 'text', status: 'active', ...overrides };
}

/** Four agents that placed no calls — the exact shape of the reported bug. */
const ROSTER: Agent[] = [
  agent({ _id: 'a1', name: 'Reception' }),
  agent({ _id: 'a2', name: 'Scheduler' }),
  agent({ _id: 'a3', name: 'Support' }),
  agent({ _id: 'a4', name: 'Billing' }),
];

interface Setup {
  metrics?: AnalyticsMetric;
  rows?: AnalyticsAgentRow[];
  roster?: Agent[];
}

function setup({ metrics, rows = [], roster = ROSTER }: Setup = {}) {
  mockDashboard.mockReturnValue(
    queryResult(metrics ? { metrics } : undefined) as unknown as ReturnType<
      typeof useDashboard
    >,
  );
  mockAgentsAnalytics.mockReturnValue(
    queryResult(rows) as unknown as ReturnType<typeof useAgentsAnalytics>,
  );
  mockAgentsList.mockReturnValue(
    queryResult({
      pages: [{ items: roster, total: roster.length, page: 1, limit: 20 }],
      pageParams: [1],
    }) as unknown as ReturnType<typeof useAgentsList>,
  );
  return renderHook(() => useDailyBrief(ORG)).result.current.brief;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useDailyBrief — agent counts come from the roster', () => {
  it('counts 4 active agents when the org has 4 agents and zero call rows', () => {
    // The regression: `/api/analytics/dashboard` reports `activeAgents: 0`
    // because it counts distinct agent ids in Retell call rows, and text agents
    // with no calls appear in none.
    const brief = setup({
      metrics: { activeAgents: 0, totalCalls: 0, successfulCalls: 0, totalCost: 0 },
      rows: [],
    });

    expect(brief.metrics.activeAgents).toBe(4);
  });

  it('ignores the analytics `activeAgents` field even when it is non-zero but wrong', () => {
    const brief = setup({ metrics: { activeAgents: 1, totalCalls: 12, successfulCalls: 9 } });

    expect(brief.metrics.activeAgents).toBe(4);
  });

  it('sizes `totalAgents` by the roster, not by the analytics row count', () => {
    const brief = setup({
      metrics: { activeAgents: 1, totalCalls: 5, successfulCalls: 4 },
      rows: [{ agentId: 'a1', agentName: 'Reception', totalCalls: 5, successRate: 80 }],
    });

    expect(brief.metrics.totalAgents).toBe(4);
  });

  it('excludes paused and inactive agents from `activeAgents` but keeps them in `totalAgents`', () => {
    const brief = setup({
      roster: [
        ...ROSTER,
        agent({ _id: 'a5', name: 'Retired', status: 'paused' }),
        agent({ _id: 'a6', name: 'Draft', status: 'inactive' }),
      ],
    });

    expect(brief.metrics.activeAgents).toBe(4);
    expect(brief.metrics.totalAgents).toBe(6);
  });

  it('agrees with the Workforce tab rather than the dashboard payload while the roster is still loading', () => {
    const brief = setup({ metrics: { activeAgents: 0 }, roster: [] });

    expect(brief.metrics.activeAgents).toBe(0);
    expect(brief.metrics.totalAgents).toBe(0);
  });
});

describe('useDailyBrief — honest windows', () => {
  it('labels the tiles with the window the dashboard query actually asks for', () => {
    const brief = setup();

    expect(mockDashboard).toHaveBeenCalledWith(ORG, '7d');
    expect(brief.metrics.windowLabel).toBe('last 7 days');
  });

  it('labels `attention` with its own 30-day window', () => {
    const brief = setup();

    expect(brief.metrics.attentionWindowLabel).toBe('last 30 days');
  });
});

describe('useDailyBrief — absent is not zero', () => {
  it('does not claim "0 tasks resolved" when there is no call signal at all', () => {
    const brief = setup({
      metrics: { activeAgents: 0, totalCalls: 0, successfulCalls: 0, totalCost: 0 },
      rows: [],
    });

    expect(brief.summary).not.toContain('0 tasks resolved');
    expect(brief.summary).toBe('4 agents on duty. No call activity in the last 7 days.');
  });

  it('does not claim a resolved count when the dashboard payload is missing entirely', () => {
    const brief = setup({ metrics: undefined, rows: [] });

    expect(brief.summary).not.toContain('0 tasks resolved');
    expect(brief.summary).toContain('4 agents on duty');
  });

  it('says nothing about agents on duty when the roster is empty too', () => {
    const brief = setup({ metrics: undefined, rows: [], roster: [] });

    expect(brief.summary).not.toContain('0 tasks resolved');
    expect(brief.summary).toBe('No agent activity to report yet.');
  });

  it('keeps the counted summary — sourced from the roster — once there is signal', () => {
    const brief = setup({
      metrics: { activeAgents: 1, totalCalls: 14, successfulCalls: 11 },
      rows: [{ agentId: 'a1', agentName: 'Reception', totalCalls: 14, successRate: 79 }],
    });

    expect(brief.summary).toBe(
      '11 tasks resolved across 4 active agents in the last 7 days. Everything is on track.',
    );
  });

  it('names the attention count in the summary when an agent is underperforming', () => {
    const brief = setup({
      metrics: { activeAgents: 1, totalCalls: 14, successfulCalls: 4 },
      rows: [{ agentId: 'a1', agentName: 'Reception', totalCalls: 14, successRate: 30 }],
    });

    expect(brief.metrics.attention).toBe(1);
    expect(brief.summary).toBe(
      '4 tasks resolved across 4 active agents in the last 7 days. 1 agent needs your attention.',
    );
    expect(brief.topPriority?.severity).toBe('critical');
  });
});
