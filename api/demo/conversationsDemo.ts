/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Fixture conversation feed for the Toshiba board demo, used when the live
 * `/api/conversations/export` feed is slow, empty, or errors. Items are
 * stamped with the RESOLVED real agent ids passed in by the caller (from
 * `resolveCanonicalIds`) so per-agent filtering works no matter which screen
 * mounts first. Timestamps are relative to now so the feed always reads
 * fresh.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { ConversationFeedItem } from '@/api/services/conversationFeed';
import type { CanonicalAgentName } from './agentProfiles';

const MIN = 60_000;

interface FixtureSpec {
  agent: CanonicalAgentName;
  channel: 'phone' | 'email';
  contact: string;
  emailSubject?: string;
  minutesAgo: number;
  durationSec?: number;
  status: string;
  summary: string;
}

/**
 * Coherence rule: nothing below contradicts the PENDING approvals deck.
 * Outbound to the overdue accounts is "queued"/"staged", proposals are drafts
 * "held", and only the two emails their commerce system REALLY sent
 * (quote-share + internal approval request) carry a "sent" status.
 */
const FIXTURES: FixtureSpec[] = [
  {
    agent: 'Alex',
    channel: 'email',
    contact: 'Nightly fleet reconciliation',
    minutesAgo: 25,
    status: 'escalated',
    summary:
      'Found 78 devices across 24 accounts with no reading in 90+ days — the outreach wave is staged and waiting for approval.',
  },
  {
    agent: 'Sophie',
    channel: 'email',
    contact: 'CT Accounting & Tax Services (Charlotte)',
    emailSubject: 'Upgrade proposal — e-STUDIO400AC (draft held)',
    minutesAgo: 55,
    status: 'held for approval',
    summary:
      'Proposal priced at $114.23/mo against $217.73 today, projected GP +$1,824 — held pending the manager check.',
  },
  {
    agent: 'Ava',
    channel: 'email',
    contact: 'Alex Johnson · Acme Manufacturing',
    emailSubject: 'Your quote from Pacific Office Solutions',
    minutesAgo: 80,
    status: 'sent',
    summary:
      'Quote-share email delivered from the commerce system; the follow-up nudge is queued for approval.',
  },
  {
    agent: 'Alex',
    channel: 'phone',
    contact: 'Stellar Financial Services',
    minutesAgo: 110,
    status: 'queued',
    summary:
      'Longest collection gap in the fleet — 668 days since the last reading. First call of the outreach wave once approved.',
  },
  {
    agent: 'Sophie',
    channel: 'email',
    contact: 'Rep desk',
    emailSubject: 'Multi-equipment leases — Homes By Dickerson, Biltmore Baptist',
    minutesAgo: 180,
    status: 'escalated',
    summary:
      'Two multi-equipment accounts routed to the rep per playbook; automated proposal suppressed (negative GP −$8,371 on one).',
  },
  {
    agent: 'Ava',
    channel: 'email',
    contact: 'Sarah Chen · dealer desk',
    emailSubject: 'Approval needed: Acme Manufacturing · $5,085',
    minutesAgo: 240,
    status: 'sent',
    summary:
      'Internal approval request delivered to the dealer desk; the manager SLA has since passed.',
  },
  {
    agent: 'Ava',
    channel: 'email',
    contact: 'Elah Baptist Church (Leland)',
    emailSubject: 'Upgrade-this-month offer (draft held)',
    minutesAgo: 300,
    status: 'held for approval',
    summary:
      'SDR hand-off received from Sophie — test offer drafted and held; Sophie’s recommendation is to hold.',
  },
  {
    agent: 'Alex',
    channel: 'email',
    contact: 'Weekly follow-up batch',
    minutesAgo: 360,
    status: 'queued',
    summary:
      'Two devices crossed the 30-day mark without a reading; queued for this week’s batch pending approval.',
  },
];

export function demoConversationFeed(
  idMap: Record<CanonicalAgentName, string>,
  agentId?: string,
): ConversationFeedItem[] {
  const now = Date.now();
  const items = FIXTURES.map((f, i) => {
    const start = now - f.minutesAgo * MIN;
    return {
      id: `demo-conv-${i}`,
      agentId: idMap[f.agent],
      agentName: f.agent,
      channel: f.channel,
      contact: f.contact,
      emailSubject: f.emailSubject,
      date: new Date(start).toISOString(),
      durationSec: f.durationSec,
      status: f.status,
      summary: f.summary,
    } satisfies ConversationFeedItem;
  });
  return agentId ? items.filter((c) => c.agentId === agentId) : items;
}
