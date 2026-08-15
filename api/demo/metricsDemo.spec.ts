/** DEMO ONLY — DO NOT MERGE. Specs for the deterministic demo metrics. */
import { demoAgentMetrics, demoAgentDetails } from './metricsDemo';

describe('demoAgentMetrics', () => {
  it('is deterministic — same agent id, same numbers, every time', () => {
    expect(demoAgentMetrics('agent-1')).toEqual(demoAgentMetrics('agent-1'));
    expect(demoAgentDetails('agent-1')).toEqual(demoAgentDetails('agent-1'));
  });

  it('differs across agents so the fleet does not look cloned', () => {
    expect(demoAgentMetrics('agent-1')).not.toEqual(demoAgentMetrics('agent-2'));
  });

  it('stays inside plausible ranges', () => {
    for (const id of ['a', 'b', 'c', 'sophie-1', 'ava-2', 'alex-3']) {
      const m = demoAgentMetrics(id);
      expect(m.performancePct).toBeGreaterThanOrEqual(84);
      expect(m.performancePct).toBeLessThanOrEqual(97);
      expect(m.costPerRun).toBeGreaterThanOrEqual(0.14);
      expect(m.costPerRun).toBeLessThanOrEqual(0.62);
      expect(m.trend).toHaveLength(12);
    }
  });

  it('keeps the KPI tiles coherent with each other', () => {
    const id = 'sophie-1';
    const m = demoAgentMetrics(id);
    const d = demoAgentDetails(id);

    expect(d.successRate).toBe(m.performancePct);
    expect(d.successfulCalls).toBe(Math.round(((d.totalCalls as number) * m.performancePct) / 100));
    // Total cost is calls × cost-per-run (rounded to cents).
    expect(d.totalCost).toBeCloseTo((d.totalCalls as number) * m.costPerRun, 1);
  });
});
