import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ScreenHeading } from '@/components/common/ScreenHeading';
import { EscalationCard } from '@/components/executive/EscalationCard';
import { FilterChipRow, type FilterOption } from '@/components/ui/FilterChipRow';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import {
  useEscalationCounts,
  useEscalationList,
  type EscalationFilters,
} from '@/api/hooks/escalationHooks';
import type { Escalation, EscalationSeverity } from '@/api/services/escalations';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';

type Filter = 'all' | 'critical' | 'mine' | 'watching';

/**
 * Chip → server query. Module-level so the object identity is stable: these
 * become part of the React Query key, and a fresh literal each render would
 * mint a new cache entry on every pass.
 *
 * `assigneeId: 'me'` is resolved to the caller by the backend — the client
 * never needs to know its own user id.
 */
const FILTER_QUERY: Record<Filter, EscalationFilters> = {
  all: {},
  critical: { severity: 'critical' },
  mine: { assigneeId: 'me' },
  watching: { status: 'assigned' },
};

/** How often the SLA countdown re-reads the clock. */
const TICK_MS = 30_000;

/**
 * The API grades severity on four levels; `EscalationCard` renders three.
 *
 * `medium` and `low` both collapse to `watching` — the card's third rail is
 * "on the radar, not on the clock", which is what both of those mean to a
 * reader triaging the queue. Narrowing here rather than widening the card's
 * prop type keeps the visual vocabulary at three rails.
 */
function toCardSeverity(severity: EscalationSeverity): 'critical' | 'high' | 'watching' {
  switch (severity) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    default:
      return 'watching';
  }
}

/**
 * Minutes left on an SLA, floored at zero.
 *
 * A past-due item yields a negative difference; the card has no "overdue"
 * state, so it clamps to `0m left` rather than counting upward into nonsense.
 */
function slaMinutesRemaining(slaDueAt: string, now: number): number {
  const due = new Date(slaDueAt).getTime();
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.round((due - now) / 60_000));
}

export default function ApprovalsScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useEscalationCounts(activeOrgId);
  const list = useEscalationList(activeOrgId, FILTER_QUERY[filter]);

  /**
   * The countdown is a live value, not a render-time snapshot. Deriving it
   * once at render would freeze every row's clock until the next unrelated
   * re-render, so a ticking `now` drives it instead.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const total = counts.data?.total ?? 0;
  const slaRisk = counts.data?.slaRisk ?? 0;

  const filters: FilterOption<Filter>[] = [
    { value: 'all', label: 'All', count: total },
    { value: 'critical', label: 'Critical', count: counts.data?.critical },
    { value: 'mine', label: 'Mine', count: counts.data?.mine },
    { value: 'watching', label: 'Watching', count: counts.data?.watching },
  ];

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="Approvals" />
      {children}
    </Screen>
  );

  if (!activeOrgId) {
    return shell(
      <EmptyState
        icon={<Ionicons name="business-outline" size={26} color={colors.fgMuted} />}
        title="Choose an organization"
        description="Select an organization to see its approval queue."
      />,
    );
  }

  if (list.isPending) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>,
    );
  }

  if (list.isError) {
    return shell(
      <ErrorState
        message={list.error instanceof Error ? list.error.message : undefined}
        onRetry={list.refetch}
      />,
    );
  }

  if (filter === 'all' && list.items.length === 0) {
    return shell(
      <EmptyState
        icon={<Ionicons name="checkmark-done-outline" size={26} color={colors.fgMuted} />}
        title="Nothing needs a decision"
        description="Escalations your agents raise will appear here."
      />,
    );
  }

  return shell(
    <ScrollView
      className="flex-1"
      // Horizontal padding lives on the children so the chip row can scroll edge to edge.
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={list.isFetching}
          onRefresh={list.refetch}
          tintColor={colors.accent}
        />
      }
    >
      <View className="px-4 pt-4">
        <ScreenHeading
          eyebrow="Approvals · inbox"
          title={`${total} awaiting decision`}
          right={
            slaRisk > 0 ? (
              <Text variant="mono.label" tone="danger">
                {`${slaRisk} SLA risk`}
              </Text>
            ) : undefined
          }
        />
      </View>

      <Animated.View entering={FadeInDown.duration(340).delay(120)} className="mt-4">
        <FilterChipRow options={filters} value={filter} onChange={setFilter} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(340).delay(180)} className="px-4 mt-4 gap-2.5">
        {list.items.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="funnel-outline" size={26} color={colors.fgMuted} />}
            title="Nothing here"
            description="No escalations match this filter."
          />
        ) : (
          // Already ordered by SLA pressure then dollar impact by the server —
          // re-sorting here would fight the keyset cursor.
          list.items.map((escalation: Escalation) => (
            <EscalationCard
              key={escalation._id}
              severity={toCardSeverity(escalation.severity)}
              title={escalation.title}
              agentName={escalation.agentName ?? 'Unattributed'}
              reason={escalation.context}
              amountAtRisk={escalation.impactAmount > 0 ? escalation.impactAmount : undefined}
              slaMinutesRemaining={slaMinutesRemaining(escalation.slaDueAt, now)}
              onReview={() =>
                router.push(`/(root)/(tabs)/approvals/${escalation._id}` as never)
              }
            />
          ))
        )}
      </Animated.View>

      {list.hasNextPage ? (
        <View className="px-4 mt-4">
          <Button
            variant="secondary"
            onPress={() => list.fetchNextPage()}
            disabled={list.isFetchingNextPage}
            leftIcon={
              list.isFetchingNextPage ? (
                <ActivityIndicator size="small" color={colors.fg} />
              ) : undefined
            }
          >
            {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </View>
      ) : null}
    </ScrollView>,
  );
}
