import { useMemo } from 'react';
import { useDashboard, useAgentsAnalytics } from './analyticsHooks';
import { useAgentsList } from './agentHooks';
import { useNotifications } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import type { Agent, AnalyticsAgentRow } from '@/api/services/types';

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

export function useWorkforce(orgId: string | null) {
  const list = useAgentsList({ orgId });
  const analytics = useAgentsAnalytics(orgId);

  const agents = useMemo<WorkforceAgent[]>(() => {
    const items = list.data?.pages.flatMap((p) => p.items) ?? [];
    const rows = analytics.data ?? [];
    return items.map((agent) => {
      const row = matchAnalytics(agent, rows);
      const successRate =
        row?.successRate ?? (typeof agent.successRate === 'number' ? agent.successRate : undefined);
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
  greeting: string;
  /** Generated from live numbers until a `/api/prime/brief` endpoint exists. */
  summary: string;
  metrics: {
    activeAgents: number;
    tasksResolved: number;
    attention: number;
    spendToday: number;
  };
  topPriority?: BriefPriority;
}

function greetingForNow(name?: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const first = name?.trim().split(' ')[0];
  return first ? `${part}, ${first}` : part;
}

export function useDailyBrief(orgId: string | null) {
  const dashboard = useDashboard(orgId);
  const analytics = useAgentsAnalytics(orgId);
  const user = useAuthStore((s) => s.user);
  const unread = useNotifications((s) => s.unreadCount());

  const brief = useMemo<DailyBrief>(() => {
    const m = dashboard.data?.metrics;
    const rows = analytics.data ?? [];

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

    const activeAgents = m?.activeAgents ?? 0;
    const tasksResolved = m?.successfulCalls ?? m?.totalCalls ?? 0;
    const spendToday = m?.totalCost ?? 0;

    const summary = topPriority
      ? `${tasksResolved} tasks resolved across ${activeAgents} active agents overnight. ${attention} ${
          attention === 1 ? 'agent needs' : 'agents need'
        } your attention.`
      : `${tasksResolved} tasks resolved across ${activeAgents} active agents. Everything is on track.`;

    return {
      greeting: greetingForNow(user?.name),
      summary,
      metrics: { activeAgents, tasksResolved, attention, spendToday },
      topPriority,
    };
  }, [dashboard.data, analytics.data, unread, user?.name]);

  return {
    brief,
    isPending: dashboard.isPending,
    isError: dashboard.isError,
    error: dashboard.error,
    isFetching: dashboard.isFetching || analytics.isFetching,
    refetch: () => {
      void dashboard.refetch();
      void analytics.refetch();
    },
  };
}
