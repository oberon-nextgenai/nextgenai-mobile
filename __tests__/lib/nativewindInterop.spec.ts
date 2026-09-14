import { execFileSync } from 'node:child_process';

/**
 * Guard for a failure that is invisible in review and total on screen.
 *
 * NativeWind only converts `className` for components it has been told about.
 * `Animated.createAnimatedComponent` mints a new component type per call, so a
 * component created inline is unregistered and silently drops every class it
 * is given — no error, no warning, just missing margins and a `flex-row` that
 * lays out as a column. That is what the SDK 53 → 57 upgrade did to nineteen
 * files at once.
 *
 * `lib/nativewindInterop.ts` exports one registered `AnimatedPressable`. This
 * asserts nobody quietly reintroduces a local, unregistered one.
 */
function grep(pattern: string): string[] {
  try {
    return execFileSync('git', ['grep', '-l', '-e', pattern, '--', '*.tsx', '*.ts'], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return []; // git grep exits 1 when there are no matches
  }
}

describe('NativeWind interop for Reanimated components', () => {
  it('has no locally-created animated Pressable', () => {
    const offenders = grep('createAnimatedComponent(Pressable)').filter(
      (f) => f !== 'lib/nativewindInterop.ts',
    );
    expect(offenders).toEqual([]);
  });

  it('registers the shared AnimatedPressable and Animated.View', () => {
    const src = require('node:fs').readFileSync('lib/nativewindInterop.ts', 'utf8');
    expect(src).toContain('cssInterop(Animated.View');
    expect(src).toContain('cssInterop(AnimatedPressable');
  });
});
