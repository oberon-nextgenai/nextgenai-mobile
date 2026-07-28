import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenHeading } from '@/components/common/ScreenHeading';
import { StatTile, type StatTone } from '@/components/executive/StatTile';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useChannelMix, useDashboard } from '@/api/hooks/analyticsHooks';
import { ChannelMixCard } from '@/components/analytics/ChannelMixCard';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtCurrency, fmtNumber, fmtPct } from '@/lib/formatters';

/**
 * Outcomes & Analytics — the workforce-level read: what the AI workforce
 * achieved over the window, and what it cost to achieve it.
 *
 * The governing rule here is that every figure on screen traces to a field the
 * dashboard endpoint actually returned. Tiles whose source metric is absent are
 * dropped rather than rendered as `0` or `—`, because a zero styled like a
 * measurement reads as a measurement. A shorter grid is the honest grid.
 *
 * Two mix cards, answering different questions. `channel-mix` counts where the
 * work happened; the agent split below it counts who did it. The dashboard
 * payload (`RetellDashboardData.charts`) is per *agent* only, which is why the
 * channel view needed its own endpoint rather than being derived here.
 */

/** Window requested by `useDashboard` — `rangeForPeriod('7d')` is now-7d → now. */
const PERIOD_LABEL = 'last 7 days';

/** How many agents the mix card lists before it stops being a mix and starts being a table. */
const MIX_ROW_LIMIT = 6;

interface Tile {
  key: string;
  label: string;
  value: string;
  caption?: string;
  tone: StatTone;
  dot?: boolean;
  /** Only set when a genuine series exists in `charts.lineData`. */
  trend?: number[];
}

function resolutionTone(rate: number): StatTone {
  if (rate >= 70) return 'success';
  if (rate >= 40) return 'warning';
  return 'danger';
}

export default function OutcomesScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const { data, isPending, isError, error, isFetching, refetch } = useDashboard(activeOrgId, '7d');
  // Its own endpoint, its own cache. Rendered when present; the card returns
  // null when the backend could count no channel at all.
  const channelMix = useChannelMix(activeOrgId);

  const metrics = data?.metrics;
  const charts = data?.charts;

  // `lineData` is the only time series in the payload. Each point carries `calls`
  // and an optional `successRate`; a tile gets a sparkline only if its own series
  // survives with more than one point.
  const series = useMemo(() => {
    const line = charts?.lineData ?? [];
    const window = line.slice(-14);
    const calls = window.map((d) => d.calls).filter((v): v is number => v != null);
    const success = window.map((d) => d.successRate).filter((v): v is number => v != null);
    return {
      calls: calls.length > 1 ? calls : undefined,
      success: success.length > 1 ? success : undefined,
    };
  }, [charts]);

  // Share-of-work by agent, derived from `charts.barData`. Sorted so the card
  // reads top-down as "who carried this week".
  const mix = useMemo(() => {
    const bars = (charts?.barData ?? []).filter((b) => (b.calls ?? 0) > 0);
    const total = bars.reduce((sum, b) => sum + b.calls, 0);
    if (bars.length === 0 || total <= 0) return null;
    const rows = [...bars]
      .sort((a, b) => b.calls - a.calls)
      .slice(0, MIX_ROW_LIMIT)
      .map((b, i) => ({
        name: b.name,
        calls: b.calls,
        share: b.calls / total,
        color: colors.chartSeries[i % colors.chartSeries.length],
      }));
    return { rows, total };
  }, [charts, colors]);

  const tiles = useMemo<Tile[]>(() => {
    if (!metrics) return [];
    const out: Tile[] = [];

    const rate = metrics.callSuccessRate;
    const resolved = metrics.successfulCalls;
    const handled = metrics.totalCalls;
    const cost = metrics.totalCost;
    const unresolved = metrics.failedCalls;

    // `callSuccessRate` arrives as a percentage already (61.1, not 0.611) —
    // same convention as `AnalyticsAgentRow.successRate`. Do not scale it.
    if (rate != null) {
      out.push({
        key: 'resolution',
        label: 'Resolution rate',
        value: fmtPct(rate),
        caption:
          resolved != null && handled != null
            ? `${fmtNumber(resolved)} of ${fmtNumber(handled)}`
            : undefined,
        tone: resolutionTone(rate),
        trend: series.success,
      });
    }

    if (handled != null) {
      out.push({
        key: 'handled',
        label: 'Interactions handled',
        value: fmtNumber(handled),
        caption: metrics.activeAgents != null ? `${fmtNumber(metrics.activeAgents)} agents` : undefined,
        tone: 'accent',
        trend: series.calls,
      });
    }

    // Cost per outcome is spend divided by the interactions that actually
    // resolved — both operands come from the payload, and the tile is skipped
    // outright if either is missing or nothing resolved.
    if (cost != null && resolved != null && resolved > 0) {
      out.push({
        key: 'cost',
        label: 'Cost per resolution',
        value: fmtCurrency(cost / resolved),
        caption: `${fmtCurrency(cost)} spent`,
        tone: 'neutral',
      });
    }

    if (unresolved != null) {
      out.push({
        key: 'attention',
        label: 'Needs a look',
        value: fmtNumber(unresolved),
        caption: 'did not resolve',
        tone: unresolved > 0 ? 'warning' : 'neutral',
        dot: unresolved > 0,
      });
    }

    return out;
  }, [metrics, series]);

  const heading = useMemo(() => {
    const handled = metrics?.totalCalls;
    const rate = metrics?.callSuccessRate;
    const cost = metrics?.totalCost;

    const title =
      handled != null
        ? `${fmtNumber(handled)} ${handled === 1 ? 'interaction' : 'interactions'}`
        : 'Outcomes';

    let subtitle: string | undefined;
    if (rate != null && cost != null) {
      subtitle = `Your workforce resolved ${fmtPct(rate)} of what it handled, at ${fmtCurrency(cost)}.`;
    } else if (rate != null) {
      subtitle = `Your workforce resolved ${fmtPct(rate)} of what it handled.`;
    } else if (cost != null) {
      subtitle = `${fmtCurrency(cost)} spent across the workforce.`;
    }

    return { title, subtitle };
  }, [metrics]);

  const header = <AppHeader title="Outcomes" showBack showOrgPill={false} />;

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      {header}
      {children}
    </Screen>
  );

  if (!activeOrgId) return shell(<EmptyState title="Choose an organization" />);

  if (isPending) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>,
    );
  }

  if (isError) {
    return shell(
      <ErrorState
        message={(error as Error)?.message ?? 'Could not load outcomes'}
        onRetry={refetch}
      />,
    );
  }

  // Nothing ran in the window: say so plainly rather than drawing an empty grid.
  if (!metrics || tiles.length === 0) {
    return shell(
      <EmptyState
        title="No activity in this period yet."
        description={`Once your agents handle work in the ${PERIOD_LABEL}, the outcomes land here.`}
      />,
    );
  }

  const rows: Tile[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));

  return shell(
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.accent} />
      }
    >
      <ScreenHeading
        eyebrow={`Outcomes · ${PERIOD_LABEL}`}
        title={heading.title}
        subtitle={heading.subtitle}
      />

      {channelMix.data ? (
        <Animated.View entering={FadeInDown.duration(340).delay(60)} className="mt-5">
          <ChannelMixCard data={channelMix.data} />
        </Animated.View>
      ) : null}

      {mix ? (
        <Animated.View entering={FadeInDown.duration(340).delay(90)} className="mt-5">
          <Card>
            <Text variant="mono.label" tone="subtle">
              Who did the work
            </Text>

            <View className="mt-3 gap-3">
              {mix.rows.map((row) => (
                <View key={row.name}>
                  <View className="flex-row items-center">
                    <Ionicons name="hardware-chip-outline" size={14} color={row.color} />
                    <Text variant="body.medium" className="ml-2 flex-1" numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text variant="mono.value" tone="muted">
                      {fmtNumber(row.calls)}
                    </Text>
                  </View>

                  {/* Share of the interactions this card accounts for. */}
                  <View
                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: colors.surface2 }}
                  >
                    <View
                      style={{
                        width: `${Math.max(2, Math.round(row.share * 100))}%`,
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: row.color,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>

            <Text variant="mono.sm" tone="subtle" className="mt-3">
              {`Share of ${fmtNumber(mix.total)} interactions attributed to an agent`}
            </Text>
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.duration(340).delay(120)} className="mt-4 gap-3">
        {rows.map((row, rowIndex) => (
          <View key={row.map((t) => t.key).join('-')} className="flex-row gap-3">
            {row.map((tile, colIndex) => (
              <StatTile
                key={tile.key}
                label={tile.label}
                value={tile.value}
                caption={tile.caption}
                trend={tile.trend}
                tone={tile.tone}
                dot={tile.dot}
                index={rowIndex * 2 + colIndex}
              />
            ))}
            {/* Keeps a lone trailing tile at half width so the grid rhythm holds. */}
            {row.length === 1 ? <View className="flex-1" /> : null}
          </View>
        ))}
      </Animated.View>
    </ScrollView>,
  );
}
