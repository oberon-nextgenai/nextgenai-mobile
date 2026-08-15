/** DEMO ONLY — DO NOT MERGE. Specs for the client-composed morning briefing. */
import { demoBriefingHeadline, demoPlatformBriefing } from './briefingDemo';
import { DEMO_LEDGER } from './agentProfiles';
import type { EscalationCounts } from '@/api/services/escalations';

function counts(total: number, critical: number): EscalationCounts {
  return { total, critical, slaRisk: 0, mine: 0, watching: 0 };
}

describe('demoBriefingHeadline', () => {
  it('pluralizes from the live counts — never hardcoded', () => {
    expect(demoBriefingHeadline(counts(4, 1))).toBe(
      'Your AI workforce handled 124 interactions overnight and resolved 96% autonomously, and flagged 4 escalations for your review — 1 critical.',
    );
    expect(demoBriefingHeadline(counts(1, 0))).toContain('flagged 1 escalation for your review');
    expect(demoBriefingHeadline(counts(1, 0))).not.toContain('critical');
  });

  it('reads clean when nothing is waiting', () => {
    expect(demoBriefingHeadline(counts(0, 0))).toContain('Nothing is waiting on you.');
  });
});

describe('demoPlatformBriefing', () => {
  const briefing = demoPlatformBriefing('org_demo', counts(4, 1), 3);

  it('stats mirror the live counts plus the ledger', () => {
    const byKey = Object.fromEntries(briefing.stats.map((s) => [s.key, s]));
    expect(byKey.escalationsOpen.value).toBe(4);
    expect(byKey.escalationsOpen.tone).toBe('warning');
    expect(byKey.critical.value).toBe(1);
    expect(byKey.critical.tone).toBe('negative');
    expect(byKey.agentsActive.value).toBe(3);
    // LLM token spend — a different metric from the minutes-plan spend.
    expect(byKey.llmSpendToday.value).toBe(DEMO_LEDGER.llmSpendToday);
    expect(byKey.llmSpendToday.value).not.toBe(DEMO_LEDGER.planSpendToday);
  });

  it('presents as a live platform briefing with a Prime prompt', () => {
    expect(briefing.provider).toBe('platform');
    expect(briefing.cached).toBe(false);
    expect(briefing.primePrompt).toBe('What needs my decision this morning?');
  });
});
