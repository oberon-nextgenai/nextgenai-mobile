import { keyboardOverlap } from '@/hooks/useWebKeyboardInset';

describe('keyboardOverlap', () => {
  it('reports the keyboard height when the visual viewport shrinks', () => {
    // 844-tall layout viewport, keyboard covers 336, page not scrolled.
    expect(keyboardOverlap(844, 508, 0)).toBe(336);
  });

  it('treats a sub-threshold shrink (URL bar / rounding) as no keyboard', () => {
    expect(keyboardOverlap(844, 800, 0)).toBe(0); // 44px < 60px threshold
    expect(keyboardOverlap(844, 844, 0)).toBe(0); // nothing covered
  });

  it('subtracts the forced-scroll offset (transient before scroll reset)', () => {
    // Safari panned the page 300px to reveal the input: the overlap collapses
    // below threshold until window.scrollTo(0,0) drives offsetTop back to 0.
    expect(keyboardOverlap(844, 508, 300)).toBe(0); // 844-508-300 = 36 < 60
    // Once reset (offsetTop 0), the full keyboard height is reported again.
    expect(keyboardOverlap(844, 508, 0)).toBe(336);
  });

  it('respects a custom threshold', () => {
    expect(keyboardOverlap(844, 800, 0, 20)).toBe(44); // 44 > 20 now counts
  });

  it('rounds fractional viewport metrics', () => {
    expect(keyboardOverlap(844, 507.4, 0)).toBe(337); // 336.6 → 337
  });
});
