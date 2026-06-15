import { View } from 'react-native';
import { MetricCard } from './MetricCard';
import { fmtNumber, fmtPct, fmtDuration } from '@/lib/formatters';
import type { AnalyticsMetric, AnalyticsChart } from '@/api/services/types';

interface KpiStripProps {
  metrics: AnalyticsMetric;
  charts?: AnalyticsChart[];
}

function chartSeries(charts: AnalyticsChart[] | undefined, keywords: string[]): number[] {
  if (!charts?.length) return [];
  const hay = (c: AnalyticsChart) =>
    `${c.type ?? ''} ${c.title ?? ''}`.toLowerCase();
  const c = charts.find((x) => keywords.some((k) => hay(x).includes(k)));
  return c?.data?.slice(-14).map((d) => d.y) ?? [];
}

/**
 * Three-card hero strip mirrors the NDS dashboard hero on web
 * (Active Cases / Approvals Today / Workflow Health). For core analytics
 * we surface the closest equivalents: Total Calls, Success Rate, Live
 * Sessions — each with an inline sparkline if the dashboard payload
 * carries a matching time-series. A compact secondary row covers the
 * remaining KPIs without competing visually.
 */
export function KpiStrip({ metrics, charts }: KpiStripProps) {
  const successRate = metrics.callSuccessRate ?? 0;
  const callsSeries = chartSeries(charts, ['call', 'volume', 'time', 'trend']);
  const successSeries = chartSeries(charts, ['success', 'rate']);
  const liveSeries = chartSeries(charts, ['live', 'session', 'concurrent']);

  return (
    <View className="gap-2.5">
      {/* Hero row */}
      <View className="flex-row gap-2.5">
        <MetricCard
          label="Total Calls"
          value={fmtNumber(metrics.totalCalls ?? 0)}
          icon="call-outline"
          sparkline={callsSeries.length > 1 ? callsSeries : undefined}
        />
        <MetricCard
          label="Success Rate"
          value={fmtPct(successRate)}
          tone={successRate >= 70 ? 'positive' : successRate >= 40 ? 'warning' : 'negative'}
          icon="checkmark-circle-outline"
          sparkline={successSeries.length > 1 ? successSeries : undefined}
        />
      </View>
      <View className="flex-row gap-2.5">
        <MetricCard
          label="Live Sessions"
          value={fmtNumber(metrics.liveActiveSessions ?? 0)}
          tone={(metrics.liveActiveSessions ?? 0) > 0 ? 'positive' : 'neutral'}
          icon="radio-outline"
          sparkline={liveSeries.length > 1 ? liveSeries : undefined}
        />
        <MetricCard
          label="Active Agents"
          value={fmtNumber(metrics.activeAgents ?? 0)}
          icon="people-outline"
        />
      </View>

      {/* Compact secondary row */}
      <View className="flex-row gap-2.5">
        <MetricCard
          variant="compact"
          label="Avg Duration"
          value={fmtDuration(metrics.averageCallDurationMinutes)}
          icon="time-outline"
        />
        <MetricCard
          variant="compact"
          label="Avg Response"
          value={
            metrics.averageResponseTimeSeconds != null
              ? `${metrics.averageResponseTimeSeconds.toFixed(1)}s`
              : '—'
          }
          icon="flash-outline"
        />
        <MetricCard
          variant="compact"
          label="Utilization"
          value={
            metrics.agentUtilizationPercent != null
              ? fmtPct(metrics.agentUtilizationPercent)
              : '—'
          }
          icon="trending-up-outline"
        />
      </View>
    </View>
  );
}
