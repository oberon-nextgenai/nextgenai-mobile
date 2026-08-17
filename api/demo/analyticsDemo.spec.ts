// DEMO ONLY — DO NOT MERGE: pins the analytics fixtures to the ledger.
import {
  applyDemoRenderOverlay,
  demoAnalyticsDashboard,
  demoDashboardRender,
  seriesSummingTo,
} from './analyticsDemo';
import { DEMO_LEDGER, CANONICAL_AGENTS } from './agentProfiles';
import type { DashboardRender } from '@/api/services/analyticsEngine';

describe('seriesSummingTo', () => {
  it('always sums exactly to the requested total', () => {
    for (const total of [195, 890, 7, 1]) {
      const parts = seriesSummingTo(total, [22, 24, 23, 25, 24, 26, 25]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every(p => p >= 0)).toBe(true);
    }
  });
});

describe('demoAnalyticsDashboard (7d)', () => {
  const dash = demoAnalyticsDashboard('7d');
  const m = dash.metrics;

  it('anchors to the ledger: 195 calls whose minutes equal the 680 voice minutes', () => {
    expect(m.totalCalls).toBe(195);
    // 195 × avg duration ≈ the 680 voice minutes every other tab claims.
    expect(Math.round(m.totalCalls! * m.averageCallDurationMinutes!)).toBeCloseTo(
      DEMO_LEDGER.voiceMinutes7d,
      -1,
    );
  });

  it('keeps every breakdown summing to the headline call count', () => {
    expect(m.successfulCalls! + m.failedCalls!).toBe(m.totalCalls);
    const s = m.sentimentBreakdown!;
    expect(s.positive + s.neutral + s.negative + s.unknown).toBe(m.totalCalls);
    const pieTotal = dash.charts!.pieData.reduce((a, p) => a + p.value, 0);
    expect(pieTotal).toBe(m.totalCalls);
    const lineTotal = dash.charts!.lineData.reduce((a, d) => a + d.calls, 0);
    expect(lineTotal).toBe(m.totalCalls);
    const sentimentChart = dash.charts!.sentimentData.reduce((a, s2) => a + s2.value, 0);
    expect(sentimentChart).toBe(m.totalCalls);
  });

  it('reports the success rate the resolution donut will show', () => {
    expect(m.callSuccessRate).toBeCloseTo((m.successfulCalls! / m.totalCalls!) * 100, 1);
  });

  it('names only canonical agents in the calls-by-agent donut', () => {
    for (const slice of dash.charts!.pieData) {
      expect(CANONICAL_AGENTS).toContain(slice.name);
      expect(slice.name).not.toMatch(/staging|test|oemt/i);
    }
  });

  it('carries no metering dollars anywhere', () => {
    expect(m.totalCost).toBeUndefined();
    expect(JSON.stringify(dash)).not.toMatch(/totalCost|\$\s?\d/);
  });

  it('gives the flat-zero performance chart a real 7-day series', () => {
    expect(dash.charts!.lineData).toHaveLength(7);
    expect(dash.charts!.lineData.every(d => d.calls > 0)).toBe(true);
  });
});

describe('demoAnalyticsDashboard (30d)', () => {
  const dash = demoAnalyticsDashboard('30d');

  it('scales to the profiles: monthly calls are the trio’s own monthly figures', () => {
    expect(dash.metrics.totalCalls).toBe(890); // Alex 830 + Sophie 60; Ava runs no calls
    expect(dash.charts!.lineData).toHaveLength(30);
    expect(dash.charts!.lineData.reduce((a, d) => a + d.calls, 0)).toBe(890);
  });
});

describe('applyDemoRenderOverlay', () => {
  function render(widgets: DashboardRender['widgets']): DashboardRender {
    return { organizationId: 'org', version: 1, title: 'Alex Meter Collection', widgets };
  }

  it('replaces only zero KPIs, by title, and leaves real data alone', () => {
    const out = applyDemoRenderOverlay(
      render([
        {
          widgetId: 'a',
          type: 'kpi',
          title: 'Total phone calls',
          data: { resource: 'r', rows: [{ count: 0 }] },
        },
        {
          widgetId: 'b',
          type: 'kpi',
          title: '% total phone success',
          data: { resource: 'r', rows: [{ percent: 0 }] },
        },
        {
          widgetId: 'c',
          type: 'kpi',
          title: 'Total emails',
          data: { resource: 'r', rows: [{ count: 42 }] }, // real → untouched
        },
        {
          widgetId: 'd',
          type: 'bar',
          title: 'Campaign count by type',
          data: { resource: 'r', rows: [{ type: 'mmr', count: 1 }] }, // chart → untouched
        },
      ]),
    );

    expect(out.widgets[0].data?.rows[0].count).toBe(830);
    expect(out.widgets[1].data?.rows[0].percent).toBe(78);
    expect(out.widgets[2].data?.rows[0].count).toBe(42);
    expect(out.widgets[3].data?.rows[0]).toEqual({ type: 'mmr', count: 1 });
  });

  it('distinguishes collected/bounced/email KPIs by their titles', () => {
    const titles = [
      ['Total phone collected', 647],
      ['Total email collected', 1024],
      ['Total emails bounced', 37],
      ['Total emails', 1313],
    ] as const;
    for (const [title, expected] of titles) {
      const out = applyDemoRenderOverlay(
        render([
          { widgetId: 'x', type: 'kpi', title, data: { resource: 'r', rows: [{ count: 0 }] } },
        ]),
      );
      expect(out.widgets[0].data?.rows[0].count).toBe(expected);
    }
  });
});

describe('demoDashboardRender fallback', () => {
  it('serves the full meter-collection grid plus real-scale campaign counts', () => {
    const out = demoDashboardRender('org', '7d');

    expect(out.title).toBe('Alex Meter Collection');
    const kpis = out.widgets.filter(w => w.type === 'kpi');
    expect(kpis).toHaveLength(6);
    expect(kpis.every(w => (w.data?.rows.length ?? 0) > 0)).toBe(true);
    const chart = out.widgets.find(w => w.type === 'bar');
    expect(chart?.data?.rows).toHaveLength(2);
  });
});
