import { shouldSeedPrompt } from './promptSeed';

describe('shouldSeedPrompt', () => {
  it('never seeds without a prompt', () => {
    expect(shouldSeedPrompt(undefined, null, '')).toBe(false);
    expect(shouldSeedPrompt('', null, '')).toBe(false);
  });

  it('never re-seeds the same prompt — even into an empty composer (it was sent)', () => {
    expect(shouldSeedPrompt('How is Ava doing?', 'How is Ava doing?', '')).toBe(false);
    expect(
      shouldSeedPrompt('How is Ava doing?', 'How is Ava doing?', 'How is Ava doing?'),
    ).toBe(false);
  });

  it('seeds a new prompt into an empty composer', () => {
    expect(shouldSeedPrompt('How is Alex doing?', null, '')).toBe(true);
    expect(shouldSeedPrompt('How is Alex doing?', 'How is Ava doing?', '  ')).toBe(true);
  });

  it('replaces an untouched previous seed, but never text the user typed', () => {
    expect(
      shouldSeedPrompt('How is Alex doing?', 'How is Ava doing?', 'How is Ava doing?'),
    ).toBe(true);
    expect(
      shouldSeedPrompt('How is Alex doing?', 'How is Ava doing?', 'my own draft'),
    ).toBe(false);
  });
});
