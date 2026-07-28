/**
 * Pure path math for `components/ui/Sparkline`.
 *
 * Kept out of the component so it can be tested without a renderer — this is the
 * only non-obvious logic in the primitive, and it is exercised on every stat tile
 * and agent row in the app.
 */

export interface SparklineGeometry {
  /** SVG path for the stroked line. */
  line: string;
  /** Closed path for the gradient fill beneath the line. */
  area: string;
  /** Approximate path length, used for the `strokeDasharray` draw-in. */
  length: number;
}

export interface SparklineGeometryInput {
  values: number[];
  width: number;
  height: number;
  strokeWidth: number;
}

/**
 * Returns `null` when there is nothing sensible to draw — no measured width yet,
 * or fewer than two points. Callers render an empty box in that case rather than
 * a misleading flat line.
 */
export function buildSparklineGeometry({
  values,
  width,
  height,
  strokeWidth,
}: SparklineGeometryInput): SparklineGeometry | null {
  if (width <= 0 || height <= 0 || values.length < 2) return null;

  // Inset by the stroke so the line never clips against the viewport edge.
  const pad = strokeWidth;
  const innerH = Math.max(height - pad * 2, 1);
  const stepX = width / (values.length - 1);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const points = values.map((v, i) => ({
    x: i * stepX,
    // A flat series sits on the centre line rather than collapsing to the floor.
    y: pad + (span === 0 ? innerH / 2 : (1 - (v - min) / span) * innerH),
  }));

  const first = points[0]!;
  const last = points[points.length - 1]!;

  // Quadratic through segment midpoints: smooth, and stable for any series.
  // Unlike a cardinal spline it cannot overshoot the data range, so a sparkline
  // never implies a value the series never reached.
  let line = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    line += ` Q ${prev.x} ${prev.y} ${(prev.x + curr.x) / 2} ${(prev.y + curr.y) / 2}`;
  }
  line += ` L ${last.x} ${last.y}`;

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  // Polyline length approximates the smoothed path closely enough for dash math —
  // the curves only shave a little off each segment, and the draw-in is eased.
  const length = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1]!;
    return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
  }, 0);

  return { line, area, length };
}
