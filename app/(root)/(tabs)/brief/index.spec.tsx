import { fireEvent, render, screen } from '@testing-library/react-native';
import BriefScreen from './index';
import { useDailyBrief } from '@/api/hooks/executiveHooks';
import { useOperationalBriefings } from '@/api/hooks/briefingHooks';
import type { OperationalBriefing } from '@/api/services/briefings';

jest.mock('@/api/hooks/executiveHooks', () => ({ useDailyBrief: jest.fn() }));
jest.mock('@/api/hooks/briefingHooks', () => ({ useOperationalBriefings: jest.fn() }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args), back: jest.fn() }),
}));

jest.mock('@/store/org', () => ({
  useActiveOrg: () => ({ activeOrgId: 'org_1', active: null, organizations: [] }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockDailyBrief = useDailyBrief as unknown as jest.Mock;
const mockBriefings = useOperationalBriefings as unknown as jest.Mock;

const SUMMARY = '12 tasks resolved across 4 active agents. Everything is on track.';

/** A dashboard that does not exist, so nothing NDS-shaped can be hardcoded. */
const WIDGETS: OperationalBriefing = {
  provider: 'acme-widgets',
  title: 'Widgets',
  date: '2026-07-30',
  headline: '6 widget lines are behind schedule.',
  stats: [{ key: 'pressed', label: 'Pressed', value: 140, delta: 12 }],
  groups: [],
  primePrompt: 'Give me the full widget briefing for today.',
  cached: true,
};

const SPROCKETS: OperationalBriefing = {
  provider: 'acme-sprockets',
  title: 'Sprockets',
  date: '2026-07-30',
  headline: 'Sprocket throughput held flat.',
  stats: [{ key: 'shipped', label: 'Shipped', value: 40 }],
  groups: [],
  cached: true,
};

function setBrief(overrides: Record<string, unknown> = {}) {
  mockDailyBrief.mockReturnValue({
    brief: {
      greeting: 'Good morning, Sara.',
      headline: 'Your workforce ran clean overnight.',
      summary: SUMMARY,
      metrics: {
        activeAgents: 4,
        totalAgents: 4,
        tasksResolved: 12,
        attention: 0,
        spendToday: 84,
        windowLabel: 'last 7 days',
        attentionWindowLabel: 'last 30 days',
      },
      ...overrides,
    },
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: jest.fn(),
  });
}

function setBriefings(briefings: OperationalBriefing[] = [], unavailable: unknown[] = []) {
  mockBriefings.mockReturnValue({
    briefings,
    unavailable,
    isPending: false,
    isFetching: false,
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  mockPush.mockClear();
  setBrief();
  setBriefings();
});

describe('BriefScreen with no operational briefing', () => {
  it('renders the hero on Prime’s own summary, exactly as it did before', () => {
    render(<BriefScreen />);

    expect(screen.getByText('Prime · Morning brief')).toBeTruthy();
    expect(screen.getByText(SUMMARY)).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('shows no operational stats and no dashboard action', () => {
    render(<BriefScreen />);

    expect(screen.queryByText('Pressed')).toBeNull();
    expect(screen.queryByText('Open dashboard')).toBeNull();
  });

  it('still renders the rest of the screen — the briefings query gates nothing', () => {
    render(<BriefScreen />);

    expect(screen.getByText('Good morning, Sara.')).toBeTruthy();
    expect(screen.getByText('Agents active')).toBeTruthy();
    expect(screen.getByText('Tasks resolved')).toBeTruthy();
  });
});

describe('BriefScreen with one operational briefing', () => {
  beforeEach(() => setBriefings([WIDGETS]));

  it('folds it into the hero rather than stacking a second brief', () => {
    render(<BriefScreen />);

    expect(screen.getByText('6 widget lines are behind schedule.')).toBeTruthy();
    expect(screen.getByText('Pressed')).toBeTruthy();
    expect(screen.getByText('140')).toBeTruthy();
    expect(screen.queryByText(SUMMARY)).toBeNull();
    // The standalone card leads with the provider title; the hero never does.
    expect(screen.queryByText('Widgets')).toBeNull();
  });

  it('opens the analytics dashboard from the hero', () => {
    render(<BriefScreen />);

    fireEvent.press(screen.getByText('Open dashboard'));

    expect(mockPush).toHaveBeenCalledWith('/(root)/(tabs)/analytics');
  });

  it('carries the briefing’s prompt into Prime', () => {
    render(<BriefScreen />);

    fireEvent.press(screen.getByText('Ask Prime'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(root)/(tabs)/prime',
      params: { prompt: 'Give me the full widget briefing for today.' },
    });
  });

  it('drops the Live dot when the briefing came from the 06:00 cache', () => {
    render(<BriefScreen />);

    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByText('2026-07-30')).toBeTruthy();
  });

  it('keeps the Live dot when the briefing was computed on the request', () => {
    setBriefings([{ ...WIDGETS, cached: false }]);
    render(<BriefScreen />);

    expect(screen.getByText('Live')).toBeTruthy();
  });
});

describe('BriefScreen with more than one dashboard installed', () => {
  it('keeps the second briefing on its own card', () => {
    setBriefings([WIDGETS, SPROCKETS]);
    render(<BriefScreen />);

    // First is the hero…
    expect(screen.getByText('6 widget lines are behind schedule.')).toBeTruthy();
    expect(screen.queryByText('Widgets')).toBeNull();
    // …and the second still gets a card, title and all.
    expect(screen.getByText('Sprockets')).toBeTruthy();
    expect(screen.getByText('Sprocket throughput held flat.')).toBeTruthy();
    expect(screen.getByText('Shipped')).toBeTruthy();
  });
});

describe('BriefScreen when a provider could not be read', () => {
  it('says so, rather than rendering an unreachable dashboard as a clean morning', () => {
    setBriefings([], [{ provider: 'acme-widgets', title: 'Widgets' }]);
    render(<BriefScreen />);

    expect(screen.getByText('Widgets')).toBeTruthy();
    expect(
      screen.getByText("This morning's read could not be loaded. Pull down to try again."),
    ).toBeTruthy();
    // The hero is untouched by the failure.
    expect(screen.getByText(SUMMARY)).toBeTruthy();
    expect(screen.getByText('Agents active')).toBeTruthy();
  });
});

describe('BriefScreen stat tiles', () => {
  it('captions the windowed tiles with the window the hook reports', () => {
    render(<BriefScreen />);

    // Tasks resolved and spend share one window; attention is measured over
    // another, and each tile says which rather than all of them saying "today".
    expect(screen.getAllByText('last 7 days')).toHaveLength(2);
    expect(screen.getByText('last 30 days')).toBeTruthy();
    expect(screen.queryByText('today')).toBeNull();
  });

  it('claims no window at all when the hook reports none', () => {
    setBrief({
      metrics: {
        activeAgents: 4,
        totalAgents: 4,
        tasksResolved: 12,
        attention: 0,
        spendToday: 84,
      },
    });
    render(<BriefScreen />);

    expect(screen.getByText('Tasks resolved')).toBeTruthy();
    expect(screen.queryByText('today')).toBeNull();
  });
});

describe('BriefScreen gates', () => {
  it('spins on the core dashboard only', () => {
    mockDailyBrief.mockReturnValue({
      brief: undefined,
      isPending: true,
      isError: false,
      error: null,
      isFetching: true,
      refetch: jest.fn(),
    });
    render(<BriefScreen />);

    expect(screen.queryByText('Prime · Morning brief')).toBeNull();
  });

  it('fails only on the core dashboard, never on the briefings query', () => {
    mockDailyBrief.mockReturnValue({
      brief: undefined,
      isPending: false,
      isError: true,
      error: new Error('dashboard is down'),
      isFetching: false,
      refetch: jest.fn(),
    });
    render(<BriefScreen />);

    expect(screen.getByText('dashboard is down')).toBeTruthy();
  });
});
