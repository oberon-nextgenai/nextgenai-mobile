import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';
// DEMO ONLY — DO NOT MERGE: fixture fallback for the Toshiba board demo.
import { DEMO_APPROVALS } from '@/api/demo/flags';
import { demoConversationFeed } from '@/api/demo/conversationsDemo';
import { resolveCanonicalIds, canonicalNameFor } from '@/api/demo/agentProfiles';
import type { Agent } from './types';

/**
 * The cross-channel conversation feed — `GET /api/conversations/export`,
 * normalized server-side across voice providers and email.
 */
export interface ConversationFeedItem {
  /** Client-synthesized — the export payload carries no row id. */
  id: string;
  agentId: string;
  agentName: string;
  channel: 'phone' | 'email';
  contact: string;
  emailSubject?: string;
  /** ISO timestamp of the conversation. */
  date: string;
  durationSec?: number;
  status?: string;
  summary?: string;
}

/** Raw row shape from the export endpoint. */
interface ExportRow {
  agentId?: string;
  agentName?: string;
  channel?: string;
  contact?: string;
  emailSubject?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  duration?: number | string;
  status?: string;
  summary?: string;
}

function toDurationSec(duration: number | string | undefined): number | undefined {
  if (typeof duration === 'number' && Number.isFinite(duration)) return duration;
  if (typeof duration === 'string') {
    const n = Number(duration);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function mapRow(row: ExportRow, index: number): ConversationFeedItem {
  return {
    id: `conv-${row.agentId ?? 'x'}-${row.date ?? row.startTime ?? index}-${index}`,
    agentId: row.agentId ?? '',
    agentName: row.agentName ?? 'Agent',
    channel: row.channel === 'email' ? 'email' : 'phone',
    contact: row.contact ?? 'Unknown contact',
    emailSubject: row.emailSubject,
    date: row.date ?? row.startTime ?? new Date(0).toISOString(),
    durationSec: toDurationSec(row.duration),
    status: row.status,
    summary: row.summary,
  };
}

export interface ConversationFeedParams {
  organizationId: string;
  agentId?: string;
  /**
   * The loaded roster, passed explicitly so demo fixtures bind to the same
   * resolved real agent ids no matter which screen fetches first.
   */
  roster: Agent[];
}

/** Demo latency budget — the CEO never watches a spinner while providers wake up. */
const DEMO_TIMEOUT_MS = 2_500;

export async function fetchConversationFeed(
  params: ConversationFeedParams,
): Promise<ConversationFeedItem[]> {
  const { organizationId, agentId, roster } = params;

  if (DEMO_APPROVALS) {
    // DEMO ONLY — DO NOT MERGE: short-fuse the live call, fall back to fixtures
    // on timeout, error, or an empty feed.
    try {
      const res = await http.get<ExportRow[]>(PATHS.conversations.export, {
        params: { organizationId, agentId },
        timeout: DEMO_TIMEOUT_MS,
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length > 0) {
        const items = rows.map(mapRow);
        // Canonical display names keep the feed consistent with the roster.
        return items.map((item) => {
          const canonical = canonicalNameFor({ name: item.agentName });
          return canonical ? { ...item, agentName: canonical } : item;
        });
      }
    } catch {
      // fall through to fixtures
    }
    return demoConversationFeed(resolveCanonicalIds(roster), agentId);
  }

  const res = await http.get<ExportRow[]>(PATHS.conversations.export, {
    params: { organizationId, agentId },
  });
  return (Array.isArray(res.data) ? res.data : []).map(mapRow);
}
