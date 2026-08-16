/** DEMO ONLY — DO NOT MERGE. Specs for the canonical profiles + metric ledger. */
import {
  DEMO_LEDGER,
  DEMO_PROFILES,
  CANONICAL_AGENTS,
  canonicalDemoRoster,
  canonicalNameFor,
  demoAgentWork7d,
  demoChannelMix,
  resolveCanonicalIds,
} from './agentProfiles';
import type { Agent } from '@/api/services/types';

function agent(overrides: Partial<Agent> & { _id: string; name: string }): Agent {
  return { type: 'text', status: 'active', ...overrides };
}

const OEMT_ROSTER: Agent[] = [
  agent({ _id: 'id-sophie', name: 'Sophie' }),
  agent({ _id: 'id-ava-cold', name: 'Ava Cold Call Email' }),
  agent({ _id: 'id-ava-nurture-text', name: 'Ava (Nurture Text)' }),
  agent({ _id: 'id-ava-nurture', name: 'Ava (Nurture)' }),
  agent({ _id: 'id-alex', name: 'Alex' }),
  agent({ _id: 'id-other', name: 'Serena' }),
];

describe('the metric ledger', () => {
  it('keeps derived values consistent with their sources', () => {
    expect(DEMO_LEDGER.overnightAutonomous).toBe(
      Math.round((DEMO_LEDGER.overnightInteractions * DEMO_LEDGER.resolvedPct) / 100),
    );
    expect(DEMO_LEDGER.resolved7d).toBe(
      Math.round((DEMO_LEDGER.interactions7d * DEMO_LEDGER.resolvedPct) / 100),
    );
  });

  it('keeps LLM spend a separate, smaller metric than plan spend', () => {
    expect(DEMO_LEDGER.llmSpendToday).toBeLessThan(DEMO_LEDGER.planSpendToday);
  });

  it('derives plan spend from the sum of the flat monthly plans', () => {
    const monthlyTotal = CANONICAL_AGENTS.reduce(
      (acc, n) => acc + DEMO_PROFILES[n].monthlyCost,
      0,
    );
    expect(monthlyTotal).toBe(17_700); // 6,300 + 7,500 + 3,900
    expect(DEMO_LEDGER.planSpendToday).toBe(Math.round(monthlyTotal / 30));
    expect(DEMO_LEDGER.planSpend7d).toBe(DEMO_LEDGER.planSpendToday * 7);
  });

  it('splits the channel mix so counts sum to the 7-day interactions', () => {
    const mix = demoChannelMix();
    const sum = mix.channels.reduce((acc, c) => acc + c.count, 0);
    expect(sum).toBe(DEMO_LEDGER.interactions7d);
    expect(mix.totalInteractions).toBe(DEMO_LEDGER.interactions7d);
  });

  it('splits who-did-the-work so counts sum to the 7-day interactions', () => {
    const sum = demoAgentWork7d().reduce((acc, r) => acc + r.interactions, 0);
    expect(sum).toBe(DEMO_LEDGER.interactions7d);
  });

  it('keeps voice minutes plausible for the call channel (2–5 min average)', () => {
    const calls = demoChannelMix().channels.find((c) => c.channel === 'calls')!.count;
    const avg = DEMO_LEDGER.voiceMinutes7d / calls;
    expect(avg).toBeGreaterThan(2);
    expect(avg).toBeLessThan(5);
  });
});

describe('canonicalDemoRoster', () => {
  it('collapses the raw roster to exactly Alex, Sophie, Ava with real ids', () => {
    const roster = canonicalDemoRoster(OEMT_ROSTER);
    expect(roster.map((e) => e.name)).toEqual(['Alex', 'Sophie', 'Ava']);
    expect(roster.map((e) => e.id)).toEqual(['id-alex', 'id-sophie', 'id-ava-cold']);
  });

  it('prefers an exact name match over a prefix match', () => {
    const roster = canonicalDemoRoster([
      agent({ _id: 'id-variant', name: 'Ava Cold Call Email' }),
      agent({ _id: 'id-exact', name: 'Ava' }),
    ]);
    expect(roster.find((e) => e.name === 'Ava')?.id).toBe('id-exact');
  });

  it('synthesizes an id only when no representative exists', () => {
    const roster = canonicalDemoRoster([agent({ _id: 'id-sophie', name: 'Sophie' })]);
    expect(roster.find((e) => e.name === 'Alex')?.id).toBe('demo-agent-alex');
    expect(roster.find((e) => e.name === 'Sophie')?.id).toBe('id-sophie');
  });
});

describe('resolveCanonicalIds', () => {
  it('binds every canonical name to the same ids the roster resolves', () => {
    const ids = resolveCanonicalIds(OEMT_ROSTER);
    expect(ids).toEqual({ Alex: 'id-alex', Sophie: 'id-sophie', Ava: 'id-ava-cold' });
  });
});

describe('canonicalNameFor', () => {
  it('maps variants to their canonical name and strangers to null', () => {
    expect(canonicalNameFor({ name: 'Ava (Nurture Text)' })).toBe('Ava');
    expect(canonicalNameFor({ name: 'sophie' })).toBe('Sophie');
    expect(canonicalNameFor({ name: 'Serena' })).toBeNull();
  });
});

describe('profiles', () => {
  it('every canonical agent carries its own audit seeds and plan numbers', () => {
    for (const name of CANONICAL_AGENTS) {
      const p = DEMO_PROFILES[name];
      expect(p.auditSeeds.length).toBeGreaterThanOrEqual(2);
      expect(p.monthlyCost).toBeGreaterThan(0);
      expect(p.planUtilizationPct).toBeGreaterThan(0);
      expect(p.planUtilizationPct).toBeLessThan(1);
      expect(p.monthlyCalls + p.monthlyEmails).toBeGreaterThan(0);
    }
    expect(DEMO_PROFILES.Alex.monthlyCost).toBe(6_300);
    expect(DEMO_PROFILES.Sophie.monthlyCost).toBe(7_500);
    expect(DEMO_PROFILES.Ava.monthlyCost).toBe(3_900);
    // Alex's volumes are the real 30-day platform dashboard numbers.
    expect(DEMO_PROFILES.Alex.monthlyCalls).toBe(830);
    expect(DEMO_PROFILES.Alex.monthlyEmails).toBe(1_313);
  });

  it('keeps the 7-day ledger within monthly-volume magnitude (±15% of monthly/4.3)', () => {
    const monthly = CANONICAL_AGENTS.reduce(
      (acc, n) => acc + DEMO_PROFILES[n].monthlyCalls + DEMO_PROFILES[n].monthlyEmails,
      0,
    );
    const weekly = monthly / 4.3;
    expect(DEMO_LEDGER.interactions7d).toBeGreaterThan(weekly * 0.85);
    expect(DEMO_LEDGER.interactions7d).toBeLessThan(weekly * 1.15);
  });
});
