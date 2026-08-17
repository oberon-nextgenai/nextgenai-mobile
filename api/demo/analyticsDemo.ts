/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Ledger-coherent analytics fixtures for the Toshiba board demo. Every number
 * here derives from `agentProfiles.ts` (DEMO_PROFILES / DEMO_LEDGER) so the
 * Analytics tab and Overview cross-check exactly against Brief, Outcomes and
 * the More menu: 195 calls / 565 emails a week, 680 voice minutes
 * (680 ÷ 195 ≈ 3.49 min per call), canonical agent names only, and no
 * metering dollars anywhere.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type {
  AnalyticsDashboard,
  DashboardLineDatum,
  DashboardPieDatum,
} from '@/api/services/types';
import type { DashboardRender, RenderPreset, RenderWidget } from '@/api/services/analyticsEngine';
import { DEMO_LEDGER, DEMO_PROFILES } from './agentProfiles';

export type DemoDashboardPeriod = '7d' | '30d';

const PROFILES = Object.values(DEMO_PROFILES);

/** Weekly calls, from the canonical channel mix (195 calls + 565 emails = 760). */
const CALLS_7D = 195;
/** Monthly calls = the profiles' own monthly figures (Alex 830 + Sophie 60; Ava runs no calls). */
const CALLS_30D = PROFILES.reduce((sum, p) => sum + p.monthlyCalls, 0);

/**
 * Distribute `total` across `weights`, rounding so the parts sum EXACTLY to the
 * total — a chart whose points don't add up to the headline number is the kind
 * of contradiction this whole module exists to prevent.
 */
export function seriesSummingTo(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map(w => (w / weightSum) * total);
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  // Largest fractional parts absorb the leftover units.
  const order = raw
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  return floored;
}

/** Gentle upward drift with believable day-to-day wobble. Fixed, not random. */
const DRIFT_30 = [
  22, 24, 23, 25, 24, 26, 25, 24, 26, 27, 26, 28, 27, 26, 28, 29, 28, 27, 29, 30, 29, 31, 30, 29,
  31, 32, 31, 30, 32, 33,
];

function dayLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function lineData(totalCalls: number, days: number): DashboardLineDatum[] {
  const weights = DRIFT_30.slice(-days);
  const calls = seriesSummingTo(totalCalls, weights);
  // Success wobbles in the mid-90s, landing where the headline rate does.
  const successShape = [94.2, 95.8, 95.1, 96.4, 95.5, 96.8, 96.1];
  return calls.map((value, i) => ({
    name: dayLabel(days - 1 - i),
    calls: value,
    successRate: successShape[i % successShape.length],
  }));
}

/** Calls split across the canonical trio, proportional to their own profiles. */
function pieData(totalCalls: number): DashboardPieDatum[] {
  const callers = PROFILES.filter(p => p.monthlyCalls > 0);
  const split = seriesSummingTo(
    totalCalls,
    callers.map(p => p.monthlyCalls),
  );
  return callers.map((p, i) => ({
    name: p.name,
    value: split[i],
    assistantId: `demo-${p.name.toLowerCase()}`,
  }));
}

/**
 * The core dashboard fixture (metrics + charts). Deliberately NO `totalCost` —
 * metering dollars never render; the cost tiles map to voice minutes instead.
 */
export function demoAnalyticsDashboard(period: DemoDashboardPeriod = '7d'): AnalyticsDashboard {
  const totalCalls = period === '30d' ? CALLS_30D : CALLS_7D;
  const failedCalls = period === '30d' ? 35 : 8;
  const successfulCalls = totalCalls - failedCalls;
  const days = period === '30d' ? 30 : 7;
  const sentiment = seriesSummingTo(totalCalls, [62, 28, 7, 3]);

  return {
    metrics: {
      totalCalls,
      successfulCalls,
      failedCalls,
      callSuccessRate: Number(((successfulCalls / totalCalls) * 100).toFixed(1)),
      // 680 voice minutes over 195 weekly calls — the ledger's own arithmetic.
      averageCallDurationMinutes: Number((DEMO_LEDGER.voiceMinutes7d / CALLS_7D).toFixed(2)),
      averageResponseTimeSeconds: 4.2,
      activeAgents: 4,
      agentUtilizationPercent: 61,
      liveActiveSessions: 0,
      evaluatedCalls: Math.round(totalCalls * 0.91),
      evalSuccessfulCalls: Math.round(totalCalls * 0.86),
      evalSuccessRate: 94.4,
      sentimentBreakdown: {
        positive: sentiment[0],
        neutral: sentiment[1],
        negative: sentiment[2],
        unknown: sentiment[3],
      },
    },
    charts: {
      barData: [],
      pieData: pieData(totalCalls),
      lineData: lineData(totalCalls, days),
      sentimentData: [
        { name: 'Positive', value: sentiment[0] },
        { name: 'Neutral', value: sentiment[1] },
        { name: 'Negative', value: sentiment[2] },
        { name: 'Unknown', value: sentiment[3] },
      ],
    },
  };
}

/**
 * Alex's meter-collection campaign totals for the query-engine KPI grid.
 * Campaign-lifetime scope, consistent with the profiles' monthly volumes:
 * collected ≈ 78% of attempts, bounces small.
 */
const RENDER_KPI_VALUES: { match: string; count?: number; percent?: number }[] = [
  { match: 'phone collected', count: 647 },
  { match: 'email collected', count: 1024 },
  { match: 'bounce', count: 37 },
  { match: 'phone success', percent: 78 },
  { match: 'phone calls', count: 830 },
  { match: 'email', count: 1313 },
];

function demoValueForTitle(title: string): { count?: number; percent?: number } | null {
  const t = title.toLowerCase();
  return RENDER_KPI_VALUES.find(v => t.includes(v.match)) ?? null;
}

/**
 * Replace ZERO KPI values with ledger numbers, leaving real non-zero data and
 * every chart widget (campaign counts are true) untouched.
 */
export function applyDemoRenderOverlay(render: DashboardRender): DashboardRender {
  return {
    ...render,
    widgets: render.widgets.map(w => {
      if (w.type !== 'kpi' || w.error) return w;
      const row = w.data?.rows?.[0];
      if (!row) return w;
      const existing = Number(row.percent ?? row.count ?? 0);
      if (Number.isFinite(existing) && existing !== 0) return w;
      const value = demoValueForTitle(w.title);
      if (!value) return w;
      const patched =
        value.percent != null ? { ...row, percent: value.percent } : { ...row, count: value.count };
      return { ...w, data: { ...w.data!, rows: [patched] } };
    }),
  };
}

/** Full fallback when the query engine itself is unreachable. */
export function demoDashboardRender(
  organizationId: string,
  _preset: RenderPreset,
): DashboardRender {
  const kpi = (widgetId: string, title: string, value: { count?: number; percent?: number }): RenderWidget => ({
    widgetId,
    type: 'kpi',
    title,
    display: value.percent != null ? { ratio: true, format: 'percent' } : undefined,
    data: { resource: 'demo', rows: [value.percent != null ? { percent: value.percent } : { count: value.count }] },
  });

  return {
    organizationId,
    version: 1,
    title: 'Alex Meter Collection',
    widgets: [
      kpi('demo-phone-calls', 'Total phone calls', { count: 830 }),
      kpi('demo-emails', 'Total emails', { count: 1313 }),
      kpi('demo-phone-collected', 'Total phone collected', { count: 647 }),
      kpi('demo-email-collected', 'Total email collected', { count: 1024 }),
      kpi('demo-emails-bounced', 'Total emails bounced', { count: 37 }),
      kpi('demo-phone-success', '% total phone success', { percent: 78 }),
      {
        widgetId: 'demo-campaigns-by-type',
        type: 'bar',
        title: 'Campaign count by type',
        data: {
          resource: 'demo',
          rows: [
            { type: 'text', count: 1 },
            { type: 'mmr', count: 1 },
          ],
        },
      },
    ],
  };
}
