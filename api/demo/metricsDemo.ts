/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Deterministic gap-filler for agent metrics during the Toshiba board demo.
 * Real analytics always win — these values are used only where the analytics
 * endpoints have nothing for an agent (text agents without call rows, agents
 * without a `vapiAgentId`), which is exactly where the UI shows "—" today.
 *
 * Seeded from the agent id, so a given agent shows the same numbers on every
 * render, refetch, and reload — no flicker, no randomness on stage.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { AgentDetails } from '@/api/services/types';

export interface DemoAgentMetrics {
  /** 84–97, doubles as the demo success rate. */
  performancePct: number;
  /** Dollars per run, $0.14–$0.62. */
  costPerRun: number;
  /** 12-point series for the roster sparkline, trending gently up. */
  trend: number[];
}

/** djb2 — stable, cheap, good enough spread for a handful of agent ids. */
function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — deterministic stream from the id hash. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoAgentMetrics(agentId: string): DemoAgentMetrics {
  const seed = hash(agentId);
  const r = prng(seed);

  const performancePct = 84 + Math.floor(r() * 14); // 84–97
  const costPerRun = Math.round((0.14 + r() * 0.48) * 100) / 100; // $0.14–$0.62

  // Every fifth agent gets a flat line so the fleet doesn't look airbrushed.
  const flat = seed % 5 === 0;
  const rise = flat ? 0 : 5 + r() * 3;
  const start = performancePct - rise;
  const trend = Array.from({ length: 12 }, (_, i) => {
    const base = start + (rise * i) / 11;
    const noise = (r() - 0.5) * 2.4;
    return Math.round((base + noise) * 10) / 10;
  });

  return { performancePct, costPerRun, trend };
}

/**
 * The four KPI tiles on the agent detail screen, coherent with each other:
 * total cost is calls × cost-per-run, successful calls follow the rate.
 */
export function demoAgentDetails(agentId: string): AgentDetails {
  const { performancePct, costPerRun } = demoAgentMetrics(agentId);
  const r = prng(hash(`${agentId}:details`));

  const totalCalls = 320 + Math.floor(r() * 2400);
  const successfulCalls = Math.round((totalCalls * performancePct) / 100);
  const averageDurationMinutes = Math.round((1.6 + r() * 4.4) * 10) / 10;
  const totalCost = Math.round(totalCalls * costPerRun * 100) / 100;

  return {
    totalCalls,
    successfulCalls,
    successRate: performancePct,
    averageDurationMinutes,
    totalCost,
  };
}
