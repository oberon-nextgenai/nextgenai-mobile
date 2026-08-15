/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Client-composed morning briefing for the Toshiba board demo. Counts are
 * PASSED IN by the caller (from the escalation-counts query) so the card is
 * reactive and always agrees with the Approvals tab badge — never read
 * imperatively from the store.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { EscalationCounts } from '@/api/services/escalations';
import type { OperationalBriefing } from '@/api/services/briefings';
import { DEMO_LEDGER } from './agentProfiles';

function plural(n: number, singular: string, pluralForm?: string): string {
  return n === 1 ? singular : (pluralForm ?? `${singular}s`);
}

/**
 * "Your AI workforce handled 1,284 interactions overnight, resolved 87%
 * autonomously, and flagged 4 escalations for your review — 1 critical."
 * Counts are live; singular/plural handled; clean variant when zero.
 */
export function demoBriefingHeadline(counts: EscalationCounts): string {
  const handled = `Your AI workforce handled ${DEMO_LEDGER.overnightInteractions.toLocaleString(
    'en-US',
  )} interactions overnight and resolved ${DEMO_LEDGER.resolvedPct}% autonomously`;

  if (counts.total <= 0) {
    return `${handled}. Nothing is waiting on you.`;
  }

  const flagged = `flagged ${counts.total} ${plural(
    counts.total,
    'escalation',
  )} for your review`;
  const critical =
    counts.critical > 0 ? ` — ${counts.critical} critical` : '';
  return `${handled}, and ${flagged}${critical}.`;
}

export function demoPlatformBriefing(
  organizationId: string,
  counts: EscalationCounts,
  rosterCount: number,
): OperationalBriefing {
  return {
    provider: 'platform',
    title: 'Operations',
    date: new Date().toISOString().slice(0, 10),
    headline: demoBriefingHeadline(counts),
    stats: [
      {
        key: 'escalationsOpen',
        label: 'Open escalations',
        value: counts.total,
        tone: counts.total > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'critical',
        label: 'Critical',
        value: counts.critical,
        tone: counts.critical > 0 ? 'negative' : 'neutral',
      },
      { key: 'agentsActive', label: 'Agents active', value: rosterCount, tone: 'neutral' },
      // Token cost — deliberately NOT the minutes-plan spend (that's the Spend tile).
      {
        key: 'llmSpendToday',
        label: 'LLM spend today',
        value: DEMO_LEDGER.llmSpendToday,
        tone: 'neutral',
      },
    ],
    groups: [],
    primePrompt: 'What needs my decision this morning?',
    cached: false,
  };
}
