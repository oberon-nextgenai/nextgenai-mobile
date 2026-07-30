import { fireEvent, render, screen } from '@testing-library/react-native';
import { OperationalBriefCard, formatDelta } from './OperationalBriefCard';
import type { OperationalBriefing } from '@/api/services/briefings';

const BRIEFING: OperationalBriefing = {
  provider: 'nds-background-checks',
  title: 'Background checks',
  date: '2026-07-30',
  headline: '3 checks need attention.',
  stats: [
    { key: 'ordered', label: 'Ordered', value: 12, delta: 4 },
    { key: 'completed', label: 'Completed', value: 9, delta: -2 },
  ],
  groups: [
    {
      key: 'attention',
      label: 'Needs attention',
      items: [{ id: 'stale_processing', title: 'Stale processing', meta: '3', tone: 'warning' }],
    },
  ],
  primePrompt: 'Give me the full background-check briefing for today.',
  cached: true,
};

describe('OperationalBriefCard', () => {
  it('leads with the provider title and the headline', () => {
    render(<OperationalBriefCard briefing={BRIEFING} />);

    expect(screen.getByText('Background checks')).toBeTruthy();
    expect(screen.getByText('3 checks need attention.')).toBeTruthy();
  });

  it('signs deltas so direction is readable without the label', () => {
    render(<OperationalBriefCard briefing={BRIEFING} />);

    expect(screen.getByText('+4')).toBeTruthy();
    expect(screen.getByText('-2')).toBeTruthy();
  });

  it('omits the delta entirely when the server did not send one', () => {
    const noDelta = { ...BRIEFING, stats: [{ key: 'ordered', label: 'Ordered', value: 12 }] };
    render(<OperationalBriefCard briefing={noDelta} />);

    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.queryByText('+0')).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders every group the server sent', () => {
    render(<OperationalBriefCard briefing={BRIEFING} />);

    expect(screen.getByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('Stale processing')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders a briefing with no groups without crashing', () => {
    render(<OperationalBriefCard briefing={{ ...BRIEFING, groups: [] }} />);

    expect(screen.getByText('Background checks')).toBeTruthy();
    expect(screen.queryByText('Needs attention')).toBeNull();
  });

  it('hands Prime the prompt verbatim', () => {
    const onAskPrime = jest.fn();
    render(<OperationalBriefCard briefing={BRIEFING} onAskPrime={onAskPrime} />);

    fireEvent.press(screen.getByText('Ask Prime'));

    expect(onAskPrime).toHaveBeenCalledWith(
      'Give me the full background-check briefing for today.',
    );
  });

  it('offers no Prime action when the briefing carries no prompt', () => {
    const { primePrompt: _unused, ...withoutPrompt } = BRIEFING;
    render(<OperationalBriefCard briefing={withoutPrompt} onAskPrime={jest.fn()} />);

    expect(screen.queryByText('Ask Prime')).toBeNull();
  });

  it('shows no action row at all when the screen wires no handlers', () => {
    render(<OperationalBriefCard briefing={BRIEFING} />);

    expect(screen.queryByText('Open dashboard')).toBeNull();
    expect(screen.queryByText('Ask Prime')).toBeNull();
  });
});

describe('formatDelta', () => {
  it.each([
    [4, '+4'],
    [-2, '-2'],
    [0, '0'],
  ])('formats %p as %p', (input, expected) => {
    expect(formatDelta(input)).toBe(expected);
  });
});
