import { View } from 'react-native';
import { MetricCard } from './MetricCard';
import { fmtNumber, fmtPct, fmtDuration, fmtCurrency } from '@/lib/formatters';
import type { AnalyticsMetric, DashboardCharts } from '@/api/services/types';

interface KpiStripProps {
  metrics: AnalyticsMetric;
  charts?: DashboardCharts;
}

/**
 * KPI strip mirroring the web core dashboard. Hero cards (Total Calls, Success
 * Rate, Live Sessions, Active Agents) carry inline sparklines derived from the
 * backend `lineData` series; a compact row covers duration/response/utilization
 * and a final row surfaces Total Cost + eval. Driven entirely by the structured
 * dashboard payload — no keyword chart-matching.
 */
export function KpiStrip({ metrics, charts }: KpiStripProps) {
  const successRate = metrics.callSuccessRate ?? 0;
  const line = charts?.lineData ?? [];
  const callsSeries = line.slice(-14).map((d) => d.calls);
  const successSeries = line
    .slice(-14)
    .map((d) => d.successRate)
    .filter((v): v is number => v != null);
  const hasEval = (metrics.evaluatedCalls ?? 0) > 0;

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

      {/* Cost + eval row */}
      <View className="flex-row gap-2.5">
        <MetricCard
          variant="compact"
          label="Total Cost"
          value={fmtCurrency(metrics.totalCost)}
          icon="cash-outline"
        />
        {hasEval ? (
          <MetricCard
            variant="compact"
            label="Eval Success"
            value={fmtPct(metrics.evalSuccessRate ?? 0)}
            tone={
              (metrics.evalSuccessRate ?? 0) >= 70
                ? 'positive'
                : (metrics.evalSuccessRate ?? 0) >= 40
                  ? 'warning'
                  : 'negative'
            }
            icon="ribbon-outline"
          />
        ) : (
          <MetricCard
            variant="compact"
            label="Evaluated"
            value={fmtNumber(metrics.evaluatedCalls ?? 0)}
            icon="ribbon-outline"
          />
        )}
      </View>
    </View>
  );
}
