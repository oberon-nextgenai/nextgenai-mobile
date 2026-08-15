/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Canonical demo-agent profiles + the metric ledger for the Toshiba board
 * demo. This module is the SINGLE source of truth for every demo number the
 * UI shows — brief, workforce, agent detail, analytics — so no two surfaces
 * can disagree on stage.
 *
 * Everything here is a pure function taking the roster explicitly. There is
 * deliberately no module-level registry: resolution must not depend on which
 * screen mounted first.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { Agent } from '@/api/services/types';

export type CanonicalAgentName = 'Alex' | 'Sophie' | 'Ava';

export const CANONICAL_AGENTS: CanonicalAgentName[] = ['Alex', 'Sophie', 'Ava'];

export interface DemoAgentProfile {
  name: CanonicalAgentName;
  role: string;
  /** Minutes-based plan (Retell voice minutes). */
  monthlyCost: number;
  includedMinutes: number;
  /** Fraction of the allowance consumed so far this month. */
  minutesUsedPct: number;
  monthlyCalls: number;
  /** Agent-specific orchestration events for the audit-trail fallback. */
  auditSeeds: string[];
}

export const DEMO_PROFILES: Record<CanonicalAgentName, DemoAgentProfile> = {
  Alex: {
    name: 'Alex',
    role: 'Meter collection',
    monthlyCost: 63_000,
    includedMinutes: 420_000,
    minutesUsedPct: 0.62,
    monthlyCalls: 38_000,
    auditSeeds: [
      'Prime tuned retry policy after 3 failed reads',
      'Prime paused batch RUN-B7E2 pending approval',
    ],
  },
  Sophie: {
    name: 'Sophie',
    role: 'Leasing',
    monthlyCost: 7_500,
    includedMinutes: 50_000,
    minutesUsedPct: 0.55,
    monthlyCalls: 4_600,
    auditSeeds: [
      'Prime drafted renewal at 12% and held for approval',
      'Policy check POL-LEASE-08 evaluated',
    ],
  },
  Ava: {
    name: 'Ava',
    role: 'SDR',
    monthlyCost: 3_900,
    includedMinutes: 26_000,
    minutesUsedPct: 0.48,
    monthlyCalls: 2_900,
    auditSeeds: [
      'Prime paused outbound sequence — 2 open Sev-1 targets',
      'Sequence copy passed brand review',
    ],
  },
};

/**
 * The metric ledger. Derived values are written out (not computed at read
 * sites) so every surface quotes literally the same number.
 *
 * `llmSpendToday` (token cost) is a DIFFERENT metric from the minutes-plan
 * spend — the briefing labels it "LLM spend today"; the Spend tile shows the
 * plan spend.
 */
export const DEMO_LEDGER = {
  overnightInteractions: 1_284,
  resolvedPct: 87,
  overnightAutonomous: 1_117, // = round(1284 × 0.87)
  interactions7d: 8_942,
  resolved7d: 7_780, // = round(8942 × 0.87)
  planSpendToday: 2_480,
  planSpend7d: 17_360,
  llmSpendToday: 80,
} as const;

export function profileForName(name: string): DemoAgentProfile | undefined {
  return DEMO_PROFILES[name as CanonicalAgentName];
}

/**
 * Channel split of the ledger's 7-day interactions, for the analytics
 * channel-mix card when the live endpoint has nothing. Calls + email only —
 * that is what the three demo agents run. Counts sum to `interactions7d`.
 */
export function demoChannelMix(): {
  totalInteractions: number;
  channels: { channel: 'calls' | 'email'; count: number; aiHandledPct?: number }[];
} {
  return {
    totalInteractions: DEMO_LEDGER.interactions7d,
    channels: [
      { channel: 'calls', count: 5_187, aiHandledPct: 84 },
      { channel: 'email', count: 3_755, aiHandledPct: 91 },
    ],
  };
}

/** 'Ava Cold Call Email' → 'Ava'; 'sophie' → 'Sophie'; anything else → null. */
export function canonicalNameFor(agent: Pick<Agent, 'name'>): CanonicalAgentName | null {
  const n = agent.name?.trim().toLowerCase() ?? '';
  for (const canonical of CANONICAL_AGENTS) {
    const c = canonical.toLowerCase();
    if (n === c || n.startsWith(c)) return canonical;
  }
  return null;
}

function agentIdOf(agent: Agent): string {
  return agent._id ?? agent.id ?? agent.name;
}

/**
 * Pick one real roster agent per canonical name: an exact name match wins,
 * otherwise the first prefix match in roster order. Returns null for a name
 * with no representative.
 */
function representativeFor(
  canonical: CanonicalAgentName,
  agents: Agent[],
): Agent | null {
  const c = canonical.toLowerCase();
  const exact = agents.find((a) => a.name?.trim().toLowerCase() === c);
  if (exact) return exact;
  return agents.find((a) => a.name?.trim().toLowerCase().startsWith(c)) ?? null;
}

export interface CanonicalRosterEntry {
  /** Real Mongo id when the agent exists; `demo-agent-<name>` only as last resort. */
  id: string;
  name: CanonicalAgentName;
  role: string;
  /** The underlying roster record, when one was resolved. */
  agent: Agent | null;
}

/**
 * The 3-agent roster the demo presents: Alex, Sophie, Ava — each bound to a
 * real roster agent where one exists so drill-downs (detail, audit,
 * conversations) fetch real data.
 */
export function canonicalDemoRoster(agents: Agent[]): CanonicalRosterEntry[] {
  return CANONICAL_AGENTS.map((name) => {
    const rep = representativeFor(name, agents);
    return {
      id: rep ? agentIdOf(rep) : `demo-agent-${name.toLowerCase()}`,
      name,
      role: DEMO_PROFILES[name].role,
      agent: rep,
    };
  });
}

/** Canonical name → resolved agent id, for stamping fixtures with real ids. */
export function resolveCanonicalIds(
  agents: Agent[],
): Record<CanonicalAgentName, string> {
  const out = {} as Record<CanonicalAgentName, string>;
  for (const entry of canonicalDemoRoster(agents)) out[entry.name] = entry.id;
  return out;
}

/** Reverse lookup for a screen that only has the id (e.g. agent detail). */
export function canonicalNameForId(
  id: string,
  agents: Agent[],
): CanonicalAgentName | null {
  const entry = canonicalDemoRoster(agents).find((e) => e.id === id);
  return entry?.name ?? null;
}
