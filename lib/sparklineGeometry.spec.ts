import { buildSparklineGeometry } from './sparklineGeometry';

const base = { width: 100, height: 40, strokeWidth: 2 };

/** Pulls every "x y" coordinate pair out of an SVG path string. */
function coords(path: string): [number, number][] {
  return [...path.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

describe('buildSparklineGeometry', () => {
  describe('returns null when there is nothing meaningful to draw', () => {
    it.each([
      ['no measured width yet', { ...base, width: 0, values: [1, 2, 3] }],
      ['zero height', { ...base, height: 0, values: [1, 2, 3] }],
      ['a single point', { ...base, values: [5] }],
      ['an empty series', { ...base, values: [] }],
    ])('%s', (_label, input) => {
      expect(buildSparklineGeometry(input)).toBeNull();
    });
  });

  it('spans the full width, first point to last', () => {
    const geo = buildSparklineGeometry({ ...base, values: [1, 5, 3, 9] })!;
    const xs = coords(geo.line).map(([x]) => x);

    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(base.width);
  });

  it('puts the maximum at the top and the minimum at the bottom, inset by the stroke', () => {
    const geo = buildSparklineGeometry({ ...base, values: [10, 0] })!;
    const ys = coords(geo.line).map(([, y]) => y);

    // pad = strokeWidth = 2; innerH = 40 - 4 = 36 → max at y=2, min at y=38.
    expect(Math.min(...ys)).toBeCloseTo(2);
    expect(Math.max(...ys)).toBeCloseTo(38);
  });

  it('centres a flat series instead of collapsing it to the floor', () => {
    const geo = buildSparklineGeometry({ ...base, values: [7, 7, 7, 7] })!;
    const ys = coords(geo.line).map(([, y]) => y);

    // Every point sits on the centre line: pad + innerH/2 = 2 + 18 = 20.
    expect(new Set(ys.map((y) => Math.round(y)))).toEqual(new Set([20]));
  });

  it('never overshoots the data range', () => {
    // A hard spike is where a cardinal spline would bulge past the max.
    const geo = buildSparklineGeometry({ ...base, values: [0, 0, 100, 0, 0] })!;
    const ys = coords(geo.line).map(([, y]) => y);

    expect(Math.min(...ys)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...ys)).toBeLessThanOrEqual(38);
  });

  it('closes the area path back along the bottom edge so the gradient fills', () => {
    const geo = buildSparklineGeometry({ ...base, values: [1, 4, 2] })!;

    expect(geo.area.startsWith(geo.line)).toBe(true);
    expect(geo.area).toContain(`L ${base.width} ${base.height}`);
    expect(geo.area).toContain(`L 0 ${base.height}`);
    expect(geo.area.endsWith('Z')).toBe(true);
  });

  it('reports a length at least the horizontal span, for the dash draw-in', () => {
    const flat = buildSparklineGeometry({ ...base, values: [5, 5, 5] })!;
    const spiky = buildSparklineGeometry({ ...base, values: [0, 100, 0] })!;

    expect(flat.length).toBeCloseTo(base.width);
    // Vertical travel makes the spiky series strictly longer than the flat one.
    expect(spiky.length).toBeGreaterThan(flat.length);
  });

  it('handles negative values', () => {
    const geo = buildSparklineGeometry({ ...base, values: [-10, 0, -5] })!;
    const ys = coords(geo.line).map(([, y]) => y);

    expect(geo.line).not.toContain('NaN');
    expect(Math.min(...ys)).toBeCloseTo(2); // 0 is the max → top
    expect(Math.max(...ys)).toBeCloseTo(38); // -10 is the min → bottom
  });
});
