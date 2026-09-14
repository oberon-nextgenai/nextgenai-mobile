import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * How many px the on-screen keyboard currently overlaps the layout viewport.
 *
 * `layoutHeight` is the app's fixed layout-viewport height
 * (`document.documentElement.clientHeight`), which iOS Safari does NOT shrink
 * when the keyboard opens. `visualHeight` / `offsetTop` come from
 * `window.visualViewport`, which DOES shrink and pan. The gap is the slice the
 * keyboard is covering. Sub-`threshold` results are noise (URL-bar collapse,
 * sub-pixel rounding) and report as 0.
 *
 * Pure and DOM-free so it is unit-testable in isolation.
 */
export function keyboardOverlap(
  layoutHeight: number,
  visualHeight: number,
  offsetTop: number,
  threshold = 60,
): number {
  const overlap = layoutHeight - visualHeight - offsetTop;
  return overlap > threshold ? Math.round(overlap) : 0;
}

/**
 * Web-only keyboard inset (px) for the shared `Screen` and the tab bar.
 *
 * Native is a hard no-op (returns 0) — React Native's `KeyboardAvoidingView`
 * handles the keyboard there. On mobile web the static shell is pinned to the
 * layout viewport (`html,body,#root{height:100%}`, `body{overflow:hidden}`) and
 * RN-Web's `KeyboardAvoidingView` is inert, so the iOS soft keyboard overlaps
 * the composer. We measure that overlap from `visualViewport` and return it as
 * an inset the layout can pad by.
 *
 * We also cancel Safari's forced focus-scroll: when it scrolls the locked page
 * to reveal the focused input, `offsetTop` absorbs the keyboard height and the
 * overlap collapses to ~0. Resetting the window scroll on each viewport event
 * keeps `offsetTop` near 0 so the inset reflects the true keyboard height. Safe
 * because `body{overflow:hidden}` means the window is never user-scrollable, and
 * `scrollTo` to an unchanged position emits no event (no loop).
 *
 * @param enabled pass `false` on screens that never take keyboard input so the
 *   listeners are skipped — the hook call itself stays unconditional.
 */
export function useWebKeyboardInset(enabled = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return; // no VisualViewport support → behaves exactly as before

    const update = () => {
      const layoutHeight = document.documentElement.clientHeight;
      const raw = layoutHeight - vv.height - vv.offsetTop;
      // Undo Safari's focus-scroll so the inset reflects the full keyboard.
      if (raw > 0) window.scrollTo(0, 0);
      setInset(keyboardOverlap(layoutHeight, vv.height, vv.offsetTop));
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return inset;
}
