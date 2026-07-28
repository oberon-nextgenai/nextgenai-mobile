import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ScreenHeading } from '@/components/common/ScreenHeading';
import { AgentHealthBar } from '@/components/executive/AgentHealthBar';
import { AgentHealthRow, type AgentStatus } from '@/components/executive/AgentHealthRow';
import { FilterChipRow, type FilterOption } from '@/components/ui/FilterChipRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { useWorkforce } from '@/api/hooks/executiveHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';

type Filter = 'all' | 'attention' | 'paused';

export default function WorkforceScreen() {
  const { activeOrgId, active } = useActiveOrg();
  const { colors } = useThemeMode();
  const wf = useWorkforce(activeOrgId);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'attention') {
      return wf.agents.filter(a => a.status === 'attention' || a.status === 'critical');
    }
    if (filter === 'paused') return wf.agents.filter(a => a.status === 'paused');
    return wf.agents;
  }, [wf.agents, filter]);

  // Tapping a health segment lands on the closest filter.
  const handleSegment = (status: AgentStatus) => {
    if (status === 'paused') setFilter('paused');
    else if (status === 'attention' || status === 'critical') setFilter('attention');
    else setFilter('all');
  };

  const filters: FilterOption<Filter>[] = [
    { value: 'all', label: 'All', count: wf.summary.total },
    { value: 'attention', label: 'Attention', count: wf.summary.attention + wf.summary.critical },
    { value: 'paused', label: 'Paused', count: wf.summary.paused },
  ];

  const eyebrow = active?.name ? `AI workforce · ${active.name}` : 'AI workforce';

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="Workforce" />
      {children}
    </Screen>
  );

  if (!activeOrgId) {
    return shell(
      <EmptyState
        icon={<Ionicons name="business-outline" size={26} color={colors.fgMuted} />}
        title="Choose an organization"
        description="Select an organization to see its AI workforce."
      />,
    );
  }

  if (wf.isPending) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>,
    );
  }

  if (wf.isError) {
    return shell(
      <ErrorState
        message={wf.error instanceof Error ? wf.error.message : undefined}
        onRetry={wf.refetch}
      />,
    );
  }

  if (wf.agents.length === 0) {
    return shell(
      <EmptyState
        icon={<Ionicons name="people-outline" size={26} color={colors.fgMuted} />}
        title="No agents yet"
        description="Agents you create appear here with their health and performance."
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
        <RefreshControl refreshing={wf.isFetching} onRefresh={wf.refetch} tintColor={colors.accent} />
      }
    >
      <View className="px-4 pt-4">
        <ScreenHeading eyebrow={eyebrow} title={`${wf.summary.total} active agents`} />
      </View>

      {/* Deliberately not wrapped in an entrance. The bar's segments already grow
          from zero — sliding the card up while its contents are drawing themselves
          in is two animations arguing over the same element. This screen's one
          moment is the bar filling, so everything else gets out of its way. */}
      <View className="px-4 mt-4">
        <AgentHealthBar
          healthy={wf.summary.healthy}
          attention={wf.summary.attention}
          paused={wf.summary.paused}
          critical={wf.summary.critical}
          onPressSegment={handleSegment}
        />
      </View>

      {/* Short and nearly simultaneous: the roster settles inside ~300ms and then
          holds still, leaving the health bar as the only thing still moving. */}
      <Animated.View entering={FadeInDown.duration(240)} className="mt-4">
        <FilterChipRow options={filters} value={filter} onChange={setFilter} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(240).delay(60)} className="px-4 mt-4 gap-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="funnel-outline" size={26} color={colors.fgMuted} />}
            title="Nothing here"
            description="No agents match this filter right now."
          />
        ) : (
          filtered.map(agent => (
            <AgentHealthRow
              key={agent.id}
              name={agent.name}
              role={agent.role}
              status={agent.status}
              performancePct={agent.performancePct}
              costPerRun={agent.costPerRun}
              trend={agent.trend}
              onPress={() => router.push(`/(root)/(tabs)/workforce/${agent.id}` as never)}
            />
          ))
        )}
      </Animated.View>

      {wf.hasNextPage ? (
        <View className="px-4 mt-4">
          <Button
            variant="secondary"
            onPress={() => wf.fetchNextPage()}
            disabled={wf.isFetchingNextPage}
            leftIcon={
              wf.isFetchingNextPage ? <ActivityIndicator size="small" color={colors.fg} /> : undefined
            }
          >
            {wf.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </View>
      ) : null}
    </ScrollView>,
  );
}
