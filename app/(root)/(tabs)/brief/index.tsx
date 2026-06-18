import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { CommandSearchButton } from '@/components/executive/CommandSearchButton';
import { PriorityCard } from '@/components/executive/PriorityCard';
import { MetricCard } from '@/components/analytics/MetricCard';
import { useDailyBrief } from '@/api/hooks/executiveHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtCurrency } from '@/lib/formatters';
import { Elevation } from '@/constants/Colors';

export default function BriefScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const { brief, isPending, isError, error, isFetching, refetch } = useDailyBrief(activeOrgId);

  const header = (
    <AppHeader
      brand
      right={
        <CommandSearchButton
          onPress={() => router.push('/(root)/command-search' as never)}
        />
      }
    />
  );

  if (!activeOrgId) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        {header}
        <EmptyState title="Choose an organization" />
      </Screen>
    );
  }

  if (isPending) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        {header}
        <ErrorState
          message={(error as Error)?.message ?? 'Could not load your brief'}
          onRetry={refetch}
        />
      </Screen>
    );
  }

  const { greeting, summary, metrics, topPriority } = brief;

  const onPressPriority = () => {
    if (topPriority?.agentId) {
      router.push(`/(root)/(tabs)/workforce/${topPriority.agentId}` as never);
    } else {
      router.push('/(root)/(tabs)/workforce' as never);
    }
  };

  return (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
      >
        {/* Greeting */}
        <View className="mb-5">
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT"
            style={{ fontFamily: 'Inter_700Bold', fontSize: 28 }}
          >
            {greeting}
          </Text>
          <Text
            className="mt-1 text-fg-muted dark:text-fg-dark-muted"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}
          >
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
        </View>

        {/* Overnight narrative */}
        <Animated.View entering={FadeInDown.duration(360).delay(60)}>
          <View
            className="rounded-4xl bg-surface dark:bg-surface-dark p-4"
            style={Elevation.sm}
          >
            <Text
              className="text-accent-2 dark:text-accent-2-dark uppercase"
              style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 }}
            >
              Overnight Brief
            </Text>
            <Text
              className="mt-2 text-fg dark:text-fg-dark-DEFAULT"
              style={{ fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23 }}
            >
              {summary}
            </Text>
          </View>
        </Animated.View>

        {/* Top priority / All clear */}
        <Animated.View entering={FadeInDown.duration(360).delay(120)} className="mt-4">
          {topPriority ? (
            <PriorityCard
              severity={topPriority.severity}
              eyebrow="NEEDS ATTENTION"
              title={topPriority.title}
              detail={topPriority.detail}
              recommendation={topPriority.recommendation}
              ctaLabel="Review workforce"
              onPressCta={onPressPriority}
              onPress={onPressPriority}
            />
          ) : (
            <View
              className="flex-row items-center gap-3 rounded-4xl bg-surface dark:bg-surface-dark p-4"
              style={Elevation.sm}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft dark:bg-accent-soft-dark">
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT"
                  style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15 }}
                >
                  All clear
                </Text>
                <Text
                  className="mt-0.5 text-fg-muted dark:text-fg-dark-muted"
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}
                >
                  Nothing needs your attention right now.
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Metrics 2x2 grid */}
        <Animated.View entering={FadeInDown.duration(360).delay(180)} className="mt-4">
          <View className="flex-row gap-3">
            <MetricCard
              variant="compact"
              label="Active agents"
              value={String(metrics.activeAgents)}
              icon="people"
            />
            <MetricCard
              variant="compact"
              label="Tasks resolved"
              value={String(metrics.tasksResolved)}
              icon="checkmark-done"
              tone="positive"
            />
          </View>
          <View className="mt-3 flex-row gap-3">
            <MetricCard
              variant="compact"
              label="Needs attention"
              value={String(metrics.attention)}
              icon="alert-circle"
              tone={metrics.attention > 0 ? 'warning' : 'neutral'}
            />
            <MetricCard
              variant="compact"
              label="Spend today"
              value={fmtCurrency(metrics.spendToday)}
              icon="card"
            />
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
