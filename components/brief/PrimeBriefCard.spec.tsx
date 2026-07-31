import { fireEvent, render, screen } from '@testing-library/react-native';
import { PrimeBriefCard } from './PrimeBriefCard';
import type { OperationalBriefing } from '@/api/services/briefings';

/**
 * The hero is now the workspace's whole morning brief, which makes two things
 * load-bearing: it must degrade to Prime's own summary when no dashboard
 * reported, and every operational string it shows must have come off the
 * payload. The fixture below is a dashboard that does not exist — if any of
 * these tests can be made to pass by hardcoding vocabulary, the card is wrong.
 */
const BRIEFING: OperationalBriefing = {
  provider: 'acme-widgets',
  title: 'Widgets',
  date: '2026-07-30',
  headline: '6 widget lines are behind schedule.',
  stats: [
    { key: 'pressed', label: 'Pressed', value: 140, delta: 12 },
    { key: 'scrapped', label: 'Scrapped', value: 8, delta: -3 },
    { key: 'queued', label: 'Queued', value: 21 },
  ],
  groups: [],
  primePrompt: 'Give me the full widget briefing for today.',
  cached: true,
};

const SUMMARY = '12 tasks resolved across 4 active agents. Everything is on track.';

function renderCard(props: Partial<React.ComponentProps<typeof PrimeBriefCard>> = {}) {
  return render(
    <PrimeBriefCard
      summary={SUMMARY}
      onAskPrime={jest.fn()}
      onOpenDashboard={jest.fn()}
      {...props}
    />,
  );
}

describe('PrimeBriefCard without a briefing', () => {
  it('falls back to Prime’s own summary', () => {
    renderCard();

    expect(screen.getByText('Prime · Morning brief')).toBeTruthy();
    expect(screen.getByText(SUMMARY)).toBeTruthy();
  });

  it('is genuinely live, so it keeps the dot', () => {
    renderCard();

    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('shows no operational stats and no dashboard action', () => {
    renderCard();

    expect(screen.queryByText('Pressed')).toBeNull();
    expect(screen.queryByText('Open dashboard')).toBeNull();
  });

  it('opens Prime cold, with no prompt to carry', () => {
    const onAskPrime = jest.fn();
    renderCard({ onAskPrime });

    fireEvent.press(screen.getByText('Ask Prime'));

    expect(onAskPrime).toHaveBeenCalledWith(undefined);
  });
});

describe('PrimeBriefCard with a briefing', () => {
  it('leads with the briefing’s headline instead of the generic summary', () => {
    renderCard({ briefing: BRIEFING });

    expect(screen.getByText('6 widget lines are behind schedule.')).toBeTruthy();
    expect(screen.queryByText(SUMMARY)).toBeNull();
  });

  it('renders the payload’s own stat labels and values', () => {
    renderCard({ briefing: BRIEFING });

    expect(screen.getByText('Pressed')).toBeTruthy();
    expect(screen.getByText('140')).toBeTruthy();
    expect(screen.getByText('Scrapped')).toBeTruthy();
    expect(screen.getByText('Queued')).toBeTruthy();
  });

  it('signs deltas, and omits the suffix where the server sent none', () => {
    renderCard({ briefing: BRIEFING });

    expect(screen.getByText('+12')).toBeTruthy();
    expect(screen.getByText('-3')).toBeTruthy();
    expect(screen.queryByText('+0')).toBeNull();
  });

  it('caps the grid at four stats so the numbers never become the card', () => {
    const many = {
      ...BRIEFING,
      stats: [1, 2, 3, 4, 5, 6].map((n) => ({ key: `s${n}`, label: `Stat ${n}`, value: n })),
    };
    renderCard({ briefing: many });

    expect(screen.getByText('Stat 4')).toBeTruthy();
    expect(screen.queryByText('Stat 5')).toBeNull();
  });

  it('offers the dashboard beside Ask Prime', () => {
    const onOpenDashboard = jest.fn();
    renderCard({ briefing: BRIEFING, onOpenDashboard });

    fireEvent.press(screen.getByText('Open dashboard'));

    expect(onOpenDashboard).toHaveBeenCalled();
  });

  it('hands Prime the briefing’s prompt verbatim', () => {
    const onAskPrime = jest.fn();
    renderCard({ briefing: BRIEFING, onAskPrime });

    fireEvent.press(screen.getByText('Ask Prime'));

    expect(onAskPrime).toHaveBeenCalledWith('Give me the full widget briefing for today.');
  });

  it('never renders the provider’s groups — those belong to the dashboard', () => {
    const withGroups = {
      ...BRIEFING,
      groups: [
        {
          key: 'attention',
          label: 'Needs attention',
          items: [{ id: 'stalled', title: 'Stalled line' }],
        },
      ],
    };
    renderCard({ briefing: withGroups });

    expect(screen.queryByText('Needs attention')).toBeNull();
    expect(screen.queryByText('Stalled line')).toBeNull();
  });
});

describe('PrimeBriefCard liveness', () => {
  it('drops the Live dot for a briefing served from the precomputed cache', () => {
    renderCard({ briefing: { ...BRIEFING, cached: true } });

    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByText('2026-07-30')).toBeTruthy();
  });

  it('keeps the Live dot for a briefing computed on the request', () => {
    renderCard({ briefing: { ...BRIEFING, cached: false } });

    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('2026-07-30')).toBeTruthy();
  });
});
