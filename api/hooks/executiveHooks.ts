import { useMemo } from 'react';
import { useDashboard, useAgentsAnalytics } from './analyticsHooks';
import { useAgentsList } from './agentHooks';
import { useNotifications } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import type { Agent, AnalyticsAgentRow, NdsPeriod } from '@/api/services/types';

/**
 * Executive UI adapters. These map the app's existing, org-scoped React Query
 * hooks into the contracts the CEO command screens consume. They invent no
 * data — every value is derived from real dashboard/agent analytics. Where a
 * dedicated endpoint does not yet exist (e.g. an overnight narrative), the
 * adapter returns a clearly-derived summary and an honest empty state.
 */

export type WorkforceStatus = 'healthy' | 'attention' | 'paused' | 'critical';

export interface WorkforceAgent {
  id: string;
  name: string;
  role: string;
  status: WorkforceStatus;
  performancePct?: number;
  costPerRun?: number;
  /**
   * Per-agent performance series for the row sparkline.
   *
   * Deliberately left unpopulated: `/api/analytics/agents/:orgId` returns
   * aggregates only (`AnalyticsAgentRow` has no time dimension), and the org-wide
   * `charts.lineData` is *not* this agent's history — rendering it here would
   * make the row assert something untrue. `AgentHealthRow` reserves the space so
   * the layout does not shift once a real per-agent series endpoint exists.
   */
  trend?: number[];
}

export interface WorkforceSummary {
  healthy: number;
  attention: number;
  paused: number;
  critical: number;
  total: number;
}

function roleLabel(agent: Agent): string {
  switch (agent.type) {
    case 'phone':
      return 'Voice agent';
    case 'text':
      return 'Chat agent';
    case 'external':
      return 'External agent';
    default:
      return agent.agentType || 'Agent';
  }
}

/** Derive a health status from lifecycle state + analytics success rate. */
function deriveStatus(agent: Agent, successRate: number | undefined): WorkforceStatus {
  const lifecycle = (agent.status ?? '').toLowerCase();
  if (lifecycle === 'paused' || lifecycle === 'inactive') return 'paused';
  if (successRate == null) return 'healthy';
  if (successRate < 40) return 'critical';
  if (successRate < 70) return 'attention';
  return 'healthy';
}

function matchAnalytics(
  agent: Agent,
  rows: AnalyticsAgentRow[],
): AnalyticsAgentRow | undefined {
  const agentId = agent._id ?? agent.id;
  return (
    rows.find((r) => r.agentId && agentId && r.agentId === agentId) ??
    rows.find((r) => r.agentName && r.agentName === agent.name)
  );
}

/**
 * The canonical success rate for an agent: the analytics row when the agent
 * placed calls in the window, the roster's own field otherwise, `undefined`
 * when neither knows — which `deriveStatus` reads as "no signal", not "bad".
 */
function successRateFor(agent: Agent, rows: AnalyticsAgentRow[]): number | undefined {
  const row = matchAnalytics(agent, rows);
  return row?.successRate ?? (typeof agent.successRate === 'number' ? agent.successRate : undefined);
}

/** Flatten the paginated `GET /api/agents` roster into a plain list. */
function rosterFrom(pages: { items: Agent[] }[] | undefined): Agent[] {
  return pages?.flatMap((p) => p.items) ?? [];
}

export function useWorkforce(orgId: string | null) {
  const list = useAgentsList({ orgId });
  const analytics = useAgentsAnalytics(orgId);

  const agents = useMemo<WorkforceAgent[]>(() => {
    const items = rosterFrom(list.data?.pages);
    const rows = analytics.data ?? [];
    return items.map((agent) => {
      const row = matchAnalytics(agent, rows);
      const successRate = successRateFor(agent, rows);
      const performancePct =
        successRate != null ? Math.round(successRate) : undefined;
      return {
        id: agent._id ?? agent.id ?? agent.name,
        name: agent.name,
        role: roleLabel(agent),
        status: deriveStatus(agent, successRate),
        performancePct,
        costPerRun:
          row && row.totalCost != null && (row.totalCalls ?? 0) > 0
            ? row.totalCost / (row.totalCalls as number)
            : undefined,
      };
    });
  }, [list.data, analytics.data]);

  const summary = useMemo<WorkforceSummary>(() => {
    const s: WorkforceSummary = {
      healthy: 0,
      attention: 0,
      paused: 0,
      critical: 0,
      total: agents.length,
    };
    for (const a of agents) s[a.status] += 1;
    return s;
  }, [agents]);

  return {
    agents,
    summary,
    isPending: list.isPending,
    isError: list.isError,
    error: list.error,
    isFetching: list.isFetching || analytics.isFetching,
    refetch: () => {
      void list.refetch();
      void analytics.refetch();
    },
    fetchNextPage: list.fetchNextPage,
    hasNextPage: list.hasNextPage,
    isFetchingNextPage: list.isFetchingNextPage,
  };
}

export type BriefSeverity = 'critical' | 'attention' | 'info';

export interface BriefPriority {
  severity: BriefSeverity;
  title: string;
  detail?: string;
  recommendation?: string;
  agentId?: string;
}

export interface DailyBrief {
  /** First serif line — "Good morning, Sara." */
  greeting: string;
  /** Second serif line — the one-sentence verdict on the night. */
  headline: string;
  /** Generated from live numbers until a `/api/prime/brief` endpoint exists. */
  summary: string;
  metrics: {
    /** Roster agents not paused/inactive — the same population the Workforce tab counts. */
    activeAgents: number;
    /** Roster size. Not the number of agents that happened to place a call. */
    totalAgents: number;
    tasksResolved: number;
    attention: number;
    spendToday: number;
    /**
     * Human-readable window that `tasksResolved` and `spendToday` actually
     * cover, for the tile caption. Pinned contract — the Brief screen renders
     * this verbatim. See `BRIEF_WINDOW_LABEL`.
     */
    windowLabel: string;
    /**
     * `attention` comes from `/api/analytics/agents/:orgId`, which the client
     * calls with no `from`/`to` and the server therefore answers over 30 days —
     * a different window from the tiles beside it. Exposed so the caption can
     * say so instead of inheriting `windowLabel`.
     */
    attentionWindowLabel: string;
  };
  topPriority?: BriefPriority;
}

/**
 * The window the brief's dashboard query asks for.
 *
 * Kept at 7 days deliberately. A true "today" tile would need a 1-day period,
 * and `rangeForPeriod` (`analyticsHooks.ts`) only maps `NdsPeriod`, which is
 * `'7d' | '30d' | '90d'` — the same union the NDS dashboard sends to the server
 * as a literal and the analytics screen renders as a period picker. Widening it
 * for one tile would ripple into that contract, so the label tells the truth
 * about the window instead of the window being quietly wrong.
 */
const BRIEF_PERIOD: NdsPeriod = '7d';

const WINDOW_LABELS: Record<NdsPeriod, string> = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
};

/** Derived from `BRIEF_PERIOD` so the caption cannot drift from the query. */
const BRIEF_WINDOW_LABEL = WINDOW_LABELS[BRIEF_PERIOD];

/** `useAgentsAnalytics` sends no range; the server defaults to 30 days. */
const ATTENTION_WINDOW_LABEL = WINDOW_LABELS['30d'];

function greetingForNow(name?: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const first = name?.trim().split(' ')[0];
  return first ? `${part}, ${first}.` : `${part}.`;
}

/**
 * The verdict line. States what happened rather than selling it, and names the
 * problem when there is one — an executive scanning this needs to know in one
 * line whether to keep reading.
 */
function headlineFor(attention: number, hasPriority: boolean): string {
  if (attention === 0 && !hasPriority) return 'Your workforce ran clean overnight.';
  if (attention === 1) return 'One agent needs your attention.';
  if (attention > 1) return `${attention} agents need your attention.`;
  return 'One item is waiting on you.';
}

export function useDailyBrief(orgId: string | null) {
  const dashboard = useDashboard(orgId, BRIEF_PERIOD);
  const analytics = useAgentsAnalytics(orgId);
  // Same query key/args as `useWorkforce`, so this shares the Workforce tab's
  // cache entry rather than issuing a second request — and, more importantly,
  // makes the two screens count agents from the same source.
  const list = useAgentsList({ orgId });
  const user = useAuthStore((s) => s.user);
  const unread = useNotifications((s) => s.unreadCount());

  const brief = useMemo<DailyBrief>(() => {
    const m = dashboard.data?.metrics;
    const rows = analytics.data ?? [];
    const roster = rosterFrom(list.data?.pages);

    // The single worst-performing agent becomes the top priority.
    const ranked = rows
      .filter((r) => typeof r.successRate === 'number')
      .sort((a, b) => (a.successRate ?? 100) - (b.successRate ?? 100));
    const worst = ranked[0];

    const attention = rows.filter(
      (r) => typeof r.successRate === 'number' && (r.successRate as number) < 70,
    ).length;

    let topPriority: BriefPriority | undefined;
    if (worst && typeof worst.successRate === 'number' && worst.successRate < 70) {
      const pct = Math.round(worst.successRate);
      const critical = worst.successRate < 40;
      topPriority = {
        severity: critical ? 'critical' : 'attention',
        title: `${worst.agentName ?? 'An agent'} is resolving ${pct}% of conversations`,
        detail: `Below the 70% target${
          worst.totalCalls ? ` across ${worst.totalCalls} recent calls` : ''
        }.`,
        recommendation:
          'Review recent transcripts and tighten the prompt, or ask Prime to diagnose the drop.',
        agentId: worst.agentId,
      };
    } else if (unread > 0) {
      topPriority = {
        severity: 'info',
        title: `${unread} new ${unread === 1 ? 'update' : 'updates'} from Prime`,
        detail: 'Tool runs and analytics events are waiting in your inbox.',
      };
    }

    // Roster counts, not call-derived ones. `metrics.activeAgents` from the
    // dashboard endpoint is `agentKeys.size` over Retell call rows in the
    // window, so a text agent — or any agent that simply did not get a call —
    // is invisible to it, and the tile read 0 for a fleet of 4. The web app
    // fixed the same bug under ND-537 (`DashboardMetrics.tsx`) by ignoring the
    // analytics field; this is the mobile counterpart, and it makes the tile
    // agree with the Workforce tab.
    const totalAgents = roster.length;
    const activeAgents = roster.filter(
      (a) => deriveStatus(a, successRateFor(a, rows)) !== 'paused',
    ).length;

    const tasksResolved = m?.successfulCalls ?? m?.totalCalls ?? 0;
    const spendToday = m?.totalCost ?? 0;

    // Distinguish "nothing happened" from "we were told nothing". The dashboard
    // endpoint answers a swallowed server error with an all-zero metrics
    // payload, and an org with no Retell agents produces the same thing, so a
    // zero here is not a fact we can put in a sentence.
    const hasCallSignal = rows.length > 0 || (m?.totalCalls ?? 0) > 0 || tasksResolved > 0;

    const summary = !hasCallSignal
      ? totalAgents > 0
        ? `${totalAgents} ${
            totalAgents === 1 ? 'agent' : 'agents'
          } on duty. No call activity in the ${BRIEF_WINDOW_LABEL}.`
        : 'No agent activity to report yet.'
      : topPriority
        ? `${tasksResolved} tasks resolved across ${activeAgents} active ${
            activeAgents === 1 ? 'agent' : 'agents'
          } in the ${BRIEF_WINDOW_LABEL}. ${attention} ${
            attention === 1 ? 'agent needs' : 'agents need'
          } your attention.`
        : `${tasksResolved} tasks resolved across ${activeAgents} active ${
            activeAgents === 1 ? 'agent' : 'agents'
          } in the ${BRIEF_WINDOW_LABEL}. Everything is on track.`;

    return {
      greeting: greetingForNow(user?.name),
      headline: headlineFor(attention, !!topPriority),
      summary,
      metrics: {
        activeAgents,
        totalAgents,
        tasksResolved,
        attention,
        spendToday,
        windowLabel: BRIEF_WINDOW_LABEL,
        attentionWindowLabel: ATTENTION_WINDOW_LABEL,
      },
      topPriority,
    };
  }, [dashboard.data, analytics.data, list.data, unread, user?.name]);

  return {
    brief,
    // Deliberately still keyed off the dashboard query alone. The roster is a
    // second, independent request; gating first paint on it would make the
    // screen slower for a number that fills in a moment later.
    isPending: dashboard.isPending,
    isError: dashboard.isError,
    error: dashboard.error,
    isFetching: dashboard.isFetching || analytics.isFetching || list.isFetching,
    refetch: () => {
      void dashboard.refetch();
      void analytics.refetch();
      void list.refetch();
    },
  };
}
