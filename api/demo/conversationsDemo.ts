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

const FIXTURES: FixtureSpec[] = [
  {
    agent: 'Alex',
    channel: 'phone',
    contact: 'Meridian Facilities Group',
    minutesAgo: 18,
    durationSec: 254,
    status: 'resolved',
    summary:
      'Confirmed modem reset at Site B; re-ran 46 meter reads successfully. 78 remain queued for the evening batch.',
  },
  {
    agent: 'Sophie',
    channel: 'email',
    contact: 'David Park · Northwind Logistics',
    emailSubject: 'Re: Lease renewal — updated terms',
    minutesAgo: 42,
    status: 'awaiting reply',
    summary:
      'Sent the revised 3-year renewal at the requested discount, pending internal approval. Flagged contract terms question for review.',
  },
  {
    agent: 'Ava',
    channel: 'email',
    contact: 'Hiro Tanaka · Kestrel Manufacturing',
    emailSubject: 'Intro — automating your field service intake',
    minutesAgo: 65,
    status: 'replied',
    summary:
      'Positive reply to the opening sequence; asked for a 20-minute call next week. Handed the booking link off automatically.',
  },
  {
    agent: 'Alex',
    channel: 'phone',
    contact: 'Harborview Estates',
    minutesAgo: 95,
    durationSec: 187,
    status: 'resolved',
    summary:
      'Verified Site D consumption spike with the facilities manager — seasonal HVAC load confirmed, meter fault ruled out.',
  },
  {
    agent: 'Sophie',
    channel: 'email',
    contact: 'Maria Lopez · Crestline Offices',
    emailSubject: 'Lease upgrade options for Q4',
    minutesAgo: 140,
    status: 'resolved',
    summary:
      'Shared upgrade options within policy; customer selected the 24-month plan. Docs queued for signature.',
  },
  {
    agent: 'Ava',
    channel: 'email',
    contact: 'Sun Wei · Atlas Logistics',
    emailSubject: 'Following up on our note last week',
    minutesAgo: 210,
    status: 'no reply',
    summary:
      'Second touch in the nurture sequence delivered; no reply yet. Next step scheduled in 3 days per cadence.',
  },
  {
    agent: 'Alex',
    channel: 'phone',
    contact: 'Meridian Facilities Group',
    minutesAgo: 260,
    durationSec: 312,
    status: 'escalated',
    summary:
      '124 failed reads across 3 sites exceeded the retry budget — escalated technician dispatch for approval.',
  },
  {
    agent: 'Sophie',
    channel: 'phone',
    contact: 'Northwind Logistics',
    minutesAgo: 330,
    durationSec: 421,
    status: 'resolved',
    summary:
      'Walked through renewal pricing live; customer asked for the loyalty discount — proposal drafted and held for approval.',
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
