import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { IconButton } from '@/components/ui/IconButton';
import { KpiStrip } from '@/components/analytics/KpiStrip';
import { ChartCard } from '@/components/analytics/ChartCard';
import { NdsHero } from '@/components/analytics/NdsHero';
import { PipelineFunnel } from '@/components/analytics/PipelineFunnel';
import { useActiveOrg } from '@/store/org';
import {
  useAnalyticsRouting,
  useAnalyticsStream,
  useDashboard,
  useMmrCampaigns,
  useNdsDashboard,
} from '@/api/hooks/analyticsHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/cn';
import { fmtNumber, fmtRelative } from '@/lib/formatters';
import type { NdsPeriod, NdsVolumeTrendPoint } from '@/api/services/types';

const PERIOD_OPTIONS: { value: NdsPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

// NDS volume-trend series colors — matched to the web NDS dashboard.
const NDS_SERIES = {
  ordered: '#06B6D4', // cyan
  completed: '#8B5CF6', // violet
  approved: '#10B981', // emerald
  denied: '#EF4444', // red
} as const;

// Palette for the per-agent breakdown pie (used when the backend datum omits a color).
const AGENT_PALETTE = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

function ndsTrendData(
  trends: NdsVolumeTrendPoint[] | undefined,
  field: 'ordered' | 'completed' | 'approved' | 'denied',
): { value: number; label?: string }[] {
  if (!trends?.length) return [];
  return trends.slice(-30).map((p) => ({
    value: p[field] ?? 0,
    label: p.date ? p.date.slice(5) : undefined,
  }));
}

// Titled donut chart with a legend. Renders nothing when there's no data, so it
// composes cleanly in the core dashboard column.
function PieCard({
  title,
  data,
  surfaceColor,
}: {
  title: string;
  data: { value: number; text: string; color: string }[];
  surfaceColor: string;
}) {
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ChartCard title={title}>
      <View className="items-center">
        <PieChart
          data={data}
          donut
          radius={80}
          innerRadius={50}
          innerCircleColor={surfaceColor}
          centerLabelComponent={() => (
            <View className="items-center">
              <Text
                className="text-fg dark:text-fg-dark-DEFAULT text-base"
                style={{ fontFamily: 'Inter_700Bold' }}
              >
                {fmtNumber(total)}
              </Text>
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Total
              </Text>
            </View>
          )}
        />
        <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-3 justify-center">
          {data.map((d, i) => (
            <View key={`${d.text}-${i}`} className="flex-row items-center">
              <View
                className="w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: d.color }}
              />
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-xs"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {d.text}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ChartCard>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { activeOrgId } = useActiveOrg();
  const [period, setPeriod] = useState<NdsPeriod>('7d');
  const [showPeriodSheet, setShowPeriodSheet] = useState(false);
  const [showOperational, setShowOperational] = useState(false);

  const routing = useAnalyticsRouting(activeOrgId);
  useAnalyticsStream(activeOrgId);

  const dashboard = useDashboard(
    routing.view?.kind === 'core' || routing.view?.kind === 'unknown'
      ? activeOrgId
      : null,
    period,
  );
  const nds = useNdsDashboard(
    routing.view?.kind === 'nds' ? activeOrgId : null,
    period,
  );
  const mmr = useMmrCampaigns(routing.view?.kind === 'mmr' ? activeOrgId : null);

  // Core analytics charts — read the structured chart arrays the backend
  // returns (RetellDashboardData.charts) directly, so nothing is dropped.
  const performance = useMemo(() => {
    const line = dashboard.data?.charts?.lineData ?? [];
    return line.slice(-30).map((d) => ({ value: d.calls, label: d.name }));
  }, [dashboard.data]);

  const resolution = useMemo(() => {
    const successful = dashboard.data?.metrics?.successfulCalls ?? 0;
    const failed = dashboard.data?.metrics?.failedCalls ?? 0;
    const total = dashboard.data?.metrics?.totalCalls ?? successful + failed;
    const other = Math.max(0, total - successful - failed);
    return [
      { value: successful, text: 'Resolved', color: colors.success },
      { value: failed, text: 'Escalated', color: colors.danger },
      { value: other, text: 'Other', color: colors.fgMuted },
    ].filter((d) => d.value > 0);
  }, [dashboard.data, colors]);

  // Per-agent call distribution (web pieData).
  const agentBreakdown = useMemo(() => {
    const pie = dashboard.data?.charts?.pieData ?? [];
    return pie
      .filter((p) => p.value > 0)
      .slice(0, 6)
      .map((p, i) => ({
        value: p.value,
        text: p.name,
        color: p.color ?? AGENT_PALETTE[i % AGENT_PALETTE.length],
      }));
  }, [dashboard.data]);

  // Sentiment split — prefer the backend sentimentData, fall back to the
  // sentimentBreakdown metric.
  const sentiment = useMemo(() => {
    const sd = (dashboard.data?.charts?.sentimentData ?? []).filter((s) => s.value > 0);
    if (sd.length) {
      const fallback: Record<string, string> = {
        positive: colors.success,
        negative: colors.danger,
        neutral: colors.fgMuted,
        unknown: colors.fgSubtle,
      };
      return sd.map((s) => ({
        value: s.value,
        text: s.name,
        color: s.color ?? fallback[s.name.toLowerCase()] ?? colors.fgMuted,
      }));
    }
    const b = dashboard.data?.metrics?.sentimentBreakdown;
    if (!b) return [];
    return [
      { value: b.positive, text: 'Positive', color: colors.success },
      { value: b.negative, text: 'Negative', color: colors.danger },
      { value: b.neutral, text: 'Neutral', color: colors.fgMuted },
      { value: b.unknown, text: 'Unknown', color: colors.fgSubtle },
    ].filter((d) => d.value > 0);
  }, [dashboard.data, colors]);

  // NDS volume-trend series — 4 series, matching the web NDS dashboard.
  const ndsOrderedSeries = useMemo(
    () => ndsTrendData(nds.data?.volumeTrends, 'ordered'),
    [nds.data],
  );
  const ndsCompletedSeries = useMemo(
    () => ndsTrendData(nds.data?.volumeTrends, 'completed'),
    [nds.data],
  );
  const ndsApprovedSeries = useMemo(
    () => ndsTrendData(nds.data?.volumeTrends, 'approved'),
    [nds.data],
  );
  const ndsDeniedSeries = useMemo(
    () => ndsTrendData(nds.data?.volumeTrends, 'denied'),
    [nds.data],
  );

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? 'Last 7 days';

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Analytics" showOrgPill={false} />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={
                dashboard.isFetching || nds.isFetching || mmr.isFetching
              }
              onRefresh={() => {
                if (routing.view?.kind === 'nds') nds.refetch();
                else if (routing.view?.kind === 'mmr') mmr.refetch();
                else dashboard.refetch();
              }}
              tintColor={colors.accent}
            />
          }
        >
          <View className="flex-row items-center justify-between mb-3">
            <Pressable onPress={() => setShowPeriodSheet(true)}>
              <Pill
                leftIcon={<Ionicons name="calendar-outline" size={13} color={colors.fg} />}
              >
                {periodLabel}
              </Pill>
            </Pressable>
            <IconButton icon="options-outline" size={32} variant="surface" />
          </View>

          {routing.isPending ? (
            <View className="py-12 items-center">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : routing.view?.kind === 'nds' ? (
            nds.isPending ? (
              <View className="py-12 items-center">
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : nds.isError ? (
              <ErrorState
                message={(nds.error as Error).message}
                onRetry={() => nds.refetch()}
              />
            ) : (
              <View className="gap-4">
                <NdsHero
                  kpis={nds.data?.actionKpis}
                  volumeTrends={nds.data?.volumeTrends}
                />

                {ndsOrderedSeries.length > 1 ? (
                  <ChartCard title="Volume Trends" subtitle="Daily, last 30 days">
                    <LineChart
                      data={ndsOrderedSeries}
                      data2={ndsCompletedSeries.length ? ndsCompletedSeries : undefined}
                      data3={ndsApprovedSeries.length ? ndsApprovedSeries : undefined}
                      data4={ndsDeniedSeries.length ? ndsDeniedSeries : undefined}
                      areaChart
                      isAnimated
                      width={280}
                      height={160}
                      color={NDS_SERIES.ordered}
                      color2={NDS_SERIES.completed}
                      color3={NDS_SERIES.approved}
                      color4={NDS_SERIES.denied}
                      startFillColor={NDS_SERIES.ordered}
                      endFillColor={NDS_SERIES.ordered}
                      startFillColor2={NDS_SERIES.completed}
                      endFillColor2={NDS_SERIES.completed}
                      startFillColor3={NDS_SERIES.approved}
                      endFillColor3={NDS_SERIES.approved}
                      startFillColor4={NDS_SERIES.denied}
                      endFillColor4={NDS_SERIES.denied}
                      startOpacity={0.16}
                      endOpacity={0.02}
                      thickness={2}
                      thickness2={2}
                      thickness3={2}
                      thickness4={2}
                      yAxisColor={colors.chartGrid}
                      xAxisColor={colors.chartGrid}
                      yAxisTextStyle={{ color: colors.chartAxis, fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: colors.chartAxis, fontSize: 9 }}
                      hideRules
                      hideDataPoints
                      noOfSections={4}
                    />
                    <View className="flex-row flex-wrap mt-3 gap-x-4 gap-y-1">
                      {(
                        [
                          ['Ordered', NDS_SERIES.ordered],
                          ['Completed', NDS_SERIES.completed],
                          ['Approved', NDS_SERIES.approved],
                          ['Denied', NDS_SERIES.denied],
                        ] as const
                      ).map(([label, color]) => (
                        <View key={label} className="flex-row items-center">
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: color,
                              marginRight: 6,
                            }}
                          />
                          <Text
                            className="text-fg-muted dark:text-fg-dark-muted text-[11px]"
                            style={{ fontFamily: 'Inter_500Medium' }}
                          >
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ChartCard>
                ) : null}

                {nds.data?.pipeline ? (
                  <ChartCard title="Pipeline funnel">
                    <PipelineFunnel data={nds.data.pipeline} />
                  </ChartCard>
                ) : null}

                {(nds.data?.queues ?? []).length > 0 ? (
                  <ChartCard title="Queues">
                    <View className="flex-row flex-wrap gap-2">
                      {(nds.data?.queues ?? []).map((q) => (
                        <View
                          key={q.name}
                          className="flex-row items-center bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark rounded-full px-3 py-1.5"
                        >
                          <Text
                            className="text-fg dark:text-fg-dark-DEFAULT text-xs"
                            style={{ fontFamily: 'Inter_500Medium' }}
                          >
                            {q.label}
                          </Text>
                          <Text
                            className="text-fg-muted dark:text-fg-dark-muted text-xs ml-2"
                            style={{ fontFamily: 'Inter_600SemiBold' }}
                          >
                            {q.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ChartCard>
                ) : null}

                <Pressable
                  onPress={() => setShowOperational((v) => !v)}
                  className="flex-row items-center justify-between bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3"
                >
                  <Text
                    className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                    style={{ fontFamily: 'Inter_600SemiBold' }}
                  >
                    {showOperational ? 'Hide operational details' : 'View operational details'}
                  </Text>
                  <Ionicons
                    name={showOperational ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.fgMuted}
                  />
                </Pressable>

                {showOperational ? (
                  <View className="gap-4">
                    {nds.data?.turnaroundTime ? (
                      <ChartCard title="Turnaround time" subtitle="Days, percentiles">
                        <View className="flex-row flex-wrap -mx-1">
                          {(
                            [
                              ['p50', nds.data.turnaroundTime.percentiles?.p50],
                              ['p75', nds.data.turnaroundTime.percentiles?.p75],
                              ['p90', nds.data.turnaroundTime.percentiles?.p90],
                              ['p95', nds.data.turnaroundTime.percentiles?.p95],
                            ] as const
                          ).map(([k, v]) => (
                            <View key={k} className="w-1/4 px-1 mb-2">
                              <Text
                                className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                                style={{ fontFamily: 'Inter_500Medium' }}
                              >
                                {k}
                              </Text>
                              <Text
                                className="text-fg dark:text-fg-dark-DEFAULT text-lg mt-0.5"
                                style={{ fontFamily: 'Inter_700Bold' }}
                              >
                                {v != null ? v.toFixed(1) : '—'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </ChartCard>
                    ) : null}

                    {(nds.data?.managerPerformance ?? []).length > 0 ? (
                      <ChartCard title="Manager performance">
                        <View className="gap-2.5">
                          {(nds.data?.managerPerformance ?? [])
                            .slice(0, 8)
                            .map((m, i) => {
                              const stats: string[] = [
                                `${fmtNumber(m.totalChecks ?? 0)} checks`,
                              ];
                              if (m.approvalRate != null) {
                                stats.push(`${Math.round(m.approvalRate)}% approval`);
                              }
                              if (m.avgTatDays != null) {
                                stats.push(`${m.avgTatDays.toFixed(1)}d TAT`);
                              }
                              if ((m.pending ?? 0) > 0) {
                                stats.push(`${m.pending} pending`);
                              }
                              return (
                                <View
                                  key={m.managerId ?? `${m.fullName ?? 'manager'}-${i}`}
                                >
                                  <View className="flex-row items-center">
                                    {m.active ? (
                                      <View
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: 3,
                                          backgroundColor: colors.success,
                                          marginRight: 8,
                                        }}
                                      />
                                    ) : null}
                                    <Text
                                      className="text-fg dark:text-fg-dark-DEFAULT text-sm flex-1"
                                      style={{ fontFamily: 'Inter_600SemiBold' }}
                                      numberOfLines={1}
                                    >
                                      {m.fullName ?? '—'}
                                    </Text>
                                  </View>
                                  <Text
                                    className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                                    style={{ fontFamily: 'Inter_500Medium' }}
                                    numberOfLines={1}
                                  >
                                    {stats.join(' · ')}
                                  </Text>
                                </View>
                              );
                            })}
                        </View>
                      </ChartCard>
                    ) : null}

                    {nds.data?.integrations ? (
                      <ChartCard title="Integration health" subtitle="Webhooks + notifications">
                        <View className="flex-row gap-4 mb-3">
                          {[
                            ['Processed', nds.data.integrations.webhooks?.processed ?? 0, 'positive'],
                            ['Unprocessed', nds.data.integrations.webhooks?.unprocessed ?? 0, 'warning'],
                          ].map(([label, value, tone]) => (
                            <View key={String(label)} className="flex-1">
                              <Text
                                className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                                style={{ fontFamily: 'Inter_500Medium' }}
                              >
                                {label}
                              </Text>
                              <Text
                                className={cn(
                                  'text-lg mt-0.5',
                                  tone === 'positive' ? 'text-success' : 'text-warning',
                                )}
                                style={{ fontFamily: 'Inter_700Bold' }}
                              >
                                {fmtNumber(Number(value))}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {(nds.data.integrations.notifications ?? []).length > 0 ? (
                          <View className="gap-1.5 pt-3 border-t border-border-subtle dark:border-border-dark-subtle">
                            {(nds.data.integrations.notifications ?? []).slice(0, 4).map((n, i) => (
                              <View key={`${n.type}-${i}`} className="flex-row items-center justify-between">
                                <Text
                                  className="text-fg dark:text-fg-dark-DEFAULT text-xs flex-1 pr-2"
                                  style={{ fontFamily: 'Inter_500Medium' }}
                                  numberOfLines={1}
                                >
                                  {n.type ?? '—'}
                                </Text>
                                <Text
                                  className="text-fg-muted dark:text-fg-dark-muted text-xs"
                                  style={{ fontFamily: 'Inter_500Medium' }}
                                >
                                  <Text className="text-success">{n.successCount ?? 0}</Text>
                                  {' / '}
                                  <Text className="text-danger">{n.failureCount ?? 0}</Text>
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </ChartCard>
                    ) : null}

                    {nds.data?.coverage &&
                    ((nds.data.coverage.byManager ?? []).length > 0 ||
                      (nds.data.coverage.byLocation ?? []).length > 0) ? (
                      <ChartCard title="Coverage">
                        {(nds.data.coverage.byManager ?? []).length > 0 ? (
                          <View className="mb-3">
                            <Text
                              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-1.5"
                              style={{ fontFamily: 'Inter_500Medium' }}
                            >
                              By manager
                            </Text>
                            {(nds.data.coverage.byManager ?? []).slice(0, 5).map((c) => (
                              <View
                                key={`mgr-${c.key}`}
                                className="flex-row items-center justify-between py-1"
                              >
                                <Text
                                  className="text-fg dark:text-fg-dark-DEFAULT text-sm flex-1 pr-2"
                                  style={{ fontFamily: 'Inter_500Medium' }}
                                  numberOfLines={1}
                                >
                                  {c.label ?? c.key}
                                </Text>
                                <Text
                                  className="text-fg-muted dark:text-fg-dark-muted text-xs"
                                  style={{ fontFamily: 'Inter_500Medium' }}
                                >
                                  {fmtNumber(c.count)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        {(nds.data.coverage.byLocation ?? []).length > 0 ? (
                          <View>
                            <Text
                              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-1.5"
                              style={{ fontFamily: 'Inter_500Medium' }}
                            >
                              By location
                            </Text>
                            {(nds.data.coverage.byLocation ?? []).slice(0, 5).map((c) => (
                              <View
                                key={`loc-${c.key}`}
                                className="flex-row items-center justify-between py-1"
                              >
                                <Text
                                  className="text-fg dark:text-fg-dark-DEFAULT text-sm flex-1 pr-2"
                                  style={{ fontFamily: 'Inter_500Medium' }}
                                  numberOfLines={1}
                                >
                                  {c.label ?? c.key}
                                </Text>
                                <Text
                                  className="text-fg-muted dark:text-fg-dark-muted text-xs"
                                  style={{ fontFamily: 'Inter_500Medium' }}
                                >
                                  {fmtNumber(c.count)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </ChartCard>
                    ) : null}

                    {(nds.data?.documents?.byStatus ?? []).length > 0 ? (
                      <ChartCard
                        title="Documents"
                        subtitle={
                          nds.data?.documents?.total != null
                            ? `${fmtNumber(nds.data.documents.total)} total`
                            : undefined
                        }
                      >
                        <View className="gap-1.5">
                          {(nds.data?.documents?.byStatus ?? []).map((b) => (
                            <View
                              key={b.status}
                              className="flex-row items-center justify-between"
                            >
                              <Text
                                className="text-fg dark:text-fg-dark-DEFAULT text-sm capitalize flex-1 pr-2"
                                style={{ fontFamily: 'Inter_500Medium' }}
                              >
                                {b.status.replace(/_/g, ' ')}
                              </Text>
                              <Text
                                className="text-fg-muted dark:text-fg-dark-muted text-xs"
                                style={{ fontFamily: 'Inter_500Medium' }}
                              >
                                {fmtNumber(b.count)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </ChartCard>
                    ) : null}

                    {nds.data?.dataQuality &&
                    (nds.data.dataQuality.totalIssues != null ||
                      (nds.data.dataQuality.byType ?? []).length > 0) ? (
                      <ChartCard title="Data quality">
                        <View className="flex-row gap-4 mb-3">
                          <View className="flex-1">
                            <Text
                              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                              style={{ fontFamily: 'Inter_500Medium' }}
                            >
                              Issues
                            </Text>
                            <Text
                              className="text-warning text-lg mt-0.5"
                              style={{ fontFamily: 'Inter_700Bold' }}
                            >
                              {fmtNumber(nds.data.dataQuality.totalIssues)}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                              style={{ fontFamily: 'Inter_500Medium' }}
                            >
                              Candidates
                            </Text>
                            <Text
                              className="text-fg dark:text-fg-dark-DEFAULT text-lg mt-0.5"
                              style={{ fontFamily: 'Inter_700Bold' }}
                            >
                              {fmtNumber(nds.data.dataQuality.totalCandidates)}
                            </Text>
                          </View>
                        </View>
                        {(nds.data.dataQuality.byType ?? []).length > 0 ? (
                          <View className="gap-1 pt-3 border-t border-border-subtle dark:border-border-dark-subtle">
                            {(nds.data.dataQuality.byType ?? []).slice(0, 5).map((b) => (
                              <View
                                key={b.type}
                                className="flex-row items-center justify-between"
                              >
                                <Text
                                  className="text-fg dark:text-fg-dark-DEFAULT text-xs flex-1 pr-2"
                                  style={{ fontFamily: 'Inter_400Regular' }}
                                  numberOfLines={1}
                                >
                                  {b.type}
                                </Text>
                                <Text
                                  className="text-fg-muted dark:text-fg-dark-muted text-xs"
                                  style={{ fontFamily: 'Inter_500Medium' }}
                                >
                                  {fmtNumber(b.count)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </ChartCard>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )
          ) : routing.view?.kind === 'mmr' ? (
            mmr.isPending ? (
              <View className="py-12 items-center">
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : mmr.isError ? (
              <ErrorState
                message={(mmr.error as Error).message}
                onRetry={() => mmr.refetch()}
              />
            ) : (mmr.data ?? []).length === 0 ? (
              <EmptyState
                title="No MMR campaigns yet"
                description="Once your team creates MMR campaigns, they'll show up here."
              />
            ) : (
              <View className="gap-2">
                {(mmr.data ?? []).map((c) => {
                  const statusTone =
                    c.status === 'active'
                      ? 'success'
                      : c.status === 'failed'
                        ? 'danger'
                        : 'neutral';
                  return (
                    <View
                      key={c._id}
                      className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3"
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text
                          className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                          style={{ fontFamily: 'Inter_600SemiBold' }}
                          numberOfLines={1}
                        >
                          {c.name ?? c._id}
                        </Text>
                        <Pill tone={statusTone}>{c.status ?? 'unknown'}</Pill>
                      </View>
                      <View className="flex-row gap-4 mt-1">
                        <Text
                          className="text-fg-muted dark:text-fg-dark-muted text-xs"
                          style={{ fontFamily: 'Inter_400Regular' }}
                        >
                          {fmtNumber(c.deviceCount)} devices
                        </Text>
                        {c.updatedAt ? (
                          <Text
                            className="text-fg-subtle dark:text-fg-dark-subtle text-xs"
                            style={{ fontFamily: 'Inter_400Regular' }}
                          >
                            updated {fmtRelative(c.updatedAt)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            // Core fallback view (no analytics plugin installed) + banner
            <View className="gap-3">
              {routing.view?.kind === 'core' ? (
                <Pressable
                  onPress={() =>
                    router.push(
                      '/plugins/install/agent-analytics-dashboard' as never,
                    )
                  }
                  className="flex-row items-center bg-accent-soft dark:bg-accent-soft-dark border border-accent/30 dark:border-accent-dark/40 rounded-xl px-3 py-2.5"
                >
                  <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
                  <Text
                    className="text-accent dark:text-accent-dark text-xs ml-2 flex-1"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    Install Agent Analytics Dashboard for richer insights
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.accent} />
                </Pressable>
              ) : null}

              {dashboard.isPending ? (
                <View className="py-12 items-center">
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : dashboard.isError ? (
                <ErrorState
                  message={(dashboard.error as Error).message}
                  onRetry={() => dashboard.refetch()}
                />
              ) : (
                <>
                  <KpiStrip
                    metrics={dashboard.data?.metrics ?? {}}
                    charts={dashboard.data?.charts}
                  />

                  <View className="flex-row gap-2 mt-1">
                    <Pressable
                      onPress={() => router.push('/(root)/(tabs)/analytics/calls')}
                      className="flex-1 flex-row items-center justify-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl py-3"
                    >
                      <Ionicons name="call-outline" size={14} color={colors.fg} />
                      <Text
                        className="text-fg dark:text-fg-dark-DEFAULT text-sm ml-2"
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        Calls
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push('/(root)/(tabs)/analytics/agents')}
                      className="flex-1 flex-row items-center justify-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl py-3"
                    >
                      <Ionicons name="people-outline" size={14} color={colors.fg} />
                      <Text
                        className="text-fg dark:text-fg-dark-DEFAULT text-sm ml-2"
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        Agents
                      </Text>
                    </Pressable>
                  </View>

                  {performance.length > 0 ? (
                    <ChartCard title="Performance over time" subtitle="Last 30 data points">
                      <LineChart
                        data={performance}
                        areaChart
                        isAnimated
                        width={280}
                        height={160}
                        color={colors.accent}
                        startFillColor={colors.accent}
                        endFillColor={colors.accent}
                        startOpacity={0.18}
                        endOpacity={0.02}
                        thickness={2}
                        yAxisColor={colors.chartGrid}
                        xAxisColor={colors.chartGrid}
                        yAxisTextStyle={{ color: colors.chartAxis, fontSize: 10 }}
                        xAxisLabelTextStyle={{ color: colors.chartAxis, fontSize: 9 }}
                        hideRules
                        hideDataPoints
                        noOfSections={4}
                      />
                    </ChartCard>
                  ) : null}

                  <PieCard
                    title="Resolution breakdown"
                    data={resolution}
                    surfaceColor={colors.surface}
                  />
                  <PieCard
                    title="Calls by agent"
                    data={agentBreakdown}
                    surfaceColor={colors.surface}
                  />
                  <PieCard
                    title="Sentiment"
                    data={sentiment}
                    surfaceColor={colors.surface}
                  />
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Period bottom sheet */}
      {showPeriodSheet ? (
        <Pressable
          onPress={() => setShowPeriodSheet(false)}
          className="absolute inset-0 bg-fg/40 dark:bg-bg-dark/60 z-40 justify-end"
        >
          <Pressable className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark rounded-t-3xl p-5">
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-base mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Period
            </Text>
            {PERIOD_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setPeriod(opt.value);
                  setShowPeriodSheet(false);
                }}
                className={cn(
                  'flex-row items-center justify-between rounded-lg px-3 py-3 mb-2',
                  period === opt.value
                    ? 'bg-accent-soft dark:bg-accent-soft-dark'
                    : 'bg-surface-2 dark:bg-surface-2-dark',
                )}
              >
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {opt.label}
                </Text>
                {period === opt.value ? (
                  <Ionicons name="checkmark" size={18} color={colors.accent} />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      ) : null}
    </Screen>
  );
}
