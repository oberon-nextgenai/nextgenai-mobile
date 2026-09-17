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
    // Assembled at runtime so this file does not contain the literal it
    // searches for — `git grep` would otherwise match this spec itself.
    const needle = 'createAnimatedComponent(' + 'Pressable)';
    const offenders = grep(needle).filter((f) => f !== 'lib/nativewindInterop.tsx');
    expect(offenders).toEqual([]);
  });

  it('registers Animated.View', () => {
    const src = require('node:fs').readFileSync('lib/nativewindInterop.tsx', 'utf8');
    expect(src).toContain('cssInterop(Animated.View');
  });

  it('styles via a plain inner view, not cssInterop on the animated component', () => {
    // Measured on an Android device: with the animated component registered via
    // `cssInterop`, a size="md" GradientButton (px-4 py-3) laid out 21pt tall —
    // bare text height, every class dropped — while plain views on the same
    // screen styled correctly. `className` must reach a plain View.
    const src = require('node:fs').readFileSync('lib/nativewindInterop.tsx', 'utf8');
    expect(src).toMatch(/<View[^>]*className=\{className\}/);
  });
});
