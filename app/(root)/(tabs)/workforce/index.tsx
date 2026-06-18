import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { AgentHealthBar } from '@/components/executive/AgentHealthBar';
import { AgentHealthRow, type AgentStatus } from '@/components/executive/AgentHealthRow';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { useWorkforce } from '@/api/hooks/executiveHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';

type Filter = 'all' | 'attention' | 'paused';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'paused', label: 'Paused' },
];

export default function WorkforceScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const wf = useWorkforce(activeOrgId);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'attention') {
      return wf.agents.filter((a) => a.status === 'attention' || a.status === 'critical');
    }
    if (filter === 'paused') {
      return wf.agents.filter((a) => a.status === 'paused');
    }
    return wf.agents;
  }, [wf.agents, filter]);

  // Map a tapped health segment onto the closest filter chip.
  const handleSegment = (status: AgentStatus) => {
    if (status === 'paused') setFilter('paused');
    else if (status === 'attention' || status === 'critical') setFilter('attention');
    else setFilter('all');
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (!activeOrgId) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        <AppHeader title="Workforce" />
        <EmptyState
          icon={<Ionicons name="business-outline" size={26} color={colors.fgMuted} />}
          title="Choose an organization"
          description="Select an organization to see its AI workforce."
        />
      </Screen>
    );
  }

  if (wf.isPending) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        <AppHeader title="Workforce" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (wf.isError) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        <AppHeader title="Workforce" />
        <ErrorState
          message={wf.error instanceof Error ? wf.error.message : undefined}
          onRetry={wf.refetch}
        />
      </Screen>
    );
  }

  if (wf.agents.length === 0) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        <AppHeader title="Workforce" />
        <EmptyState
          icon={<Ionicons name="people-outline" size={26} color={colors.fgMuted} />}
          title="No agents yet"
          description="Agents you create will appear here with their health and performance."
        />
      </Screen>
    );
  }

  return (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="Workforce" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={wf.isFetching}
            onRefresh={wf.refetch}
            tintColor={colors.accent}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(320)}>
          <AgentHealthBar
            healthy={wf.summary.healthy}
            attention={wf.summary.attention}
            paused={wf.summary.paused}
            critical={wf.summary.critical}
            onPressSegment={handleSegment}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(320).delay(60)}
          className="flex-row flex-wrap gap-2 mt-4"
        >
          {FILTERS.map((f) => {
            const count =
              f.key === 'all'
                ? wf.summary.total
                : f.key === 'attention'
                  ? wf.summary.attention + wf.summary.critical
                  : wf.summary.paused;
            return (
              <Chip
                key={f.key}
                label={`${f.label} (${count})`}
                selected={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            );
          })}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(120)} className="gap-2 mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="funnel-outline" size={26} color={colors.fgMuted} />}
              title="Nothing here"
              description="No agents match this filter right now."
            />
          ) : (
            filtered.map((agent) => (
              <AgentHealthRow
                key={agent.id}
                name={agent.name}
                role={agent.role}
                status={agent.status}
                performancePct={agent.performancePct}
                costPerRun={agent.costPerRun}
                trend={agent.trend}
                onPress={() =>
                  router.push(`/(root)/(tabs)/workforce/${agent.id}` as never)
                }
              />
            ))
          )}
        </Animated.View>

        {wf.hasNextPage ? (
          <View className="mt-4">
            <Button
              variant="ghost"
              onPress={() => wf.fetchNextPage()}
              disabled={wf.isFetchingNextPage}
              leftIcon={
                wf.isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={colors.fg} />
                ) : undefined
              }
            >
              {wf.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
