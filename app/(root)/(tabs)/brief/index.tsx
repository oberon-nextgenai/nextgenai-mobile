import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
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
import { StatTile } from '@/components/executive/StatTile';
import { OperationalBriefCard } from '@/components/brief/OperationalBriefCard';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { GradientButton } from '@/components/ui/GradientButton';
import { useDailyBrief } from '@/api/hooks/executiveHooks';
import { useOperationalBriefings } from '@/api/hooks/briefingHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtCurrency } from '@/lib/formatters';

/**
 * The brief's one moment: the screen assembles top-to-bottom in a single sweep
 * that is over inside ~450ms, and then the stat numerals count up. Four blocks a
 * beat apart — not four independent animations that happen to be near each other.
 *
 * Reanimated's layout animations default to `ReduceMotion.System`, so this whole
 * sequence is skipped when the OS setting is on; `CountUp` opts out separately.
 */
const BEAT = 50;
const enter = (step: number) => FadeInDown.duration(300).delay(step * BEAT);

export default function BriefScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const { brief, isPending, isError, error, isFetching, refetch } = useDailyBrief(activeOrgId);
  // Deliberately not folded into the gates below. A workspace's dashboard
  // briefing failing must cost one card, never the whole morning brief.
  const {
    briefings,
    unavailable,
    isFetching: briefingsFetching,
    refetch: refetchBriefings,
  } = useOperationalBriefings(activeOrgId);

  const header = (
    <AppHeader
      brand
      right={<CommandSearchButton onPress={() => router.push('/(root)/command-search' as never)} />}
    />
  );

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
        message={(error as Error)?.message ?? 'Could not load your brief'}
        onRetry={refetch}
      />,
    );
  }

  const { greeting, headline, summary, metrics, topPriority } = brief;

  const onPressPriority = () => {
    router.push(
      topPriority?.agentId
        ? (`/(root)/(tabs)/workforce/${topPriority.agentId}` as never)
        : ('/(root)/(tabs)/workforce' as never),
    );
  };

  return shell(
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching || briefingsFetching}
          onRefresh={() => {
            refetch();
            void refetchBriefings();
          }}
          tintColor={colors.accent}
        />
      }
    >
      {/* The greeting is the one place the app speaks in the first person, so it
          gets the serif and a mono timestamp for provenance. */}
      <Animated.View entering={enter(0)}>
        <Text variant="mono.label" tone="subtle">
          {format(new Date(), 'EEE · MMM d, yyyy · HH:mm')}
        </Text>
        <Text variant="display.lg" className="mt-2">
          {greeting}
        </Text>
        <Text variant="display.lg" tone="muted">
          {headline}
        </Text>
      </Animated.View>

      {/* Prime's overnight read — the hero surface, so it gets the sheen. */}
      <Animated.View entering={enter(1)} className="mt-5">
        <Card variant="prime" gloss>
          <View className="flex-row items-center justify-between">
            <Text variant="mono.label" tone="accent">
              Prime · Morning brief
            </Text>
            <View className="flex-row items-center">
              <View
                className="h-1.5 w-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: colors.successBright }}
              />
              <Text variant="mono.label" tone="success">
                Live
              </Text>
            </View>
          </View>

          <Text variant="body.lg" className="mt-3">
            {summary}
          </Text>

          <View className="mt-4">
            <GradientButton
              onPress={() => router.push('/(root)/(tabs)/prime' as never)}
              rightIcon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
            >
              Ask Prime
            </GradientButton>
          </View>
        </Card>
      </Animated.View>

      {/* Each installed dashboard's morning read. A workspace with no analytics
          dashboard gets none of these, and the sweep closes up behind them. */}
      {briefings.map((operational, i) => (
        <Animated.View key={operational.provider} entering={enter(2 + i)} className="mt-4">
          <OperationalBriefCard
            briefing={operational}
            onOpenDashboard={() => router.push('/(root)/(tabs)/analytics' as never)}
            onAskPrime={(prompt) =>
              router.push({
                pathname: '/(root)/(tabs)/prime',
                params: { prompt },
              } as never)
            }
          />
        </Animated.View>
      ))}

      {/* A provider that exists but could not be read. Saying nothing here would
          render an unreachable database as a clean morning. */}
      {unavailable.map((item) => (
        <Animated.View
          key={item.provider}
          entering={enter(2 + briefings.length)}
          className="mt-4"
        >
          <Card>
            <Text variant="mono.label" tone="subtle">
              {item.title}
            </Text>
            <Text variant="body.md" tone="muted" className="mt-2">
              This morning&apos;s read could not be loaded. Pull down to try again.
            </Text>
          </Card>
        </Animated.View>
      ))}

      {topPriority ? (
        <Animated.View entering={enter(2 + briefings.length + unavailable.length)} className="mt-4">
          <PriorityCard
            severity={topPriority.severity}
            eyebrow="Needs attention"
            title={topPriority.title}
            detail={topPriority.detail}
            recommendation={topPriority.recommendation}
            ctaLabel="Review workforce"
            onPressCta={onPressPriority}
            onPress={onPressPriority}
          />
        </Animated.View>
      ) : null}

      {/* 2×2 instrumentation. The sweep lands here and hands off to the numerals,
          which count up from zero once — the screen's one deliberate moment. */}
      <Animated.View
        entering={enter(3 + briefings.length + unavailable.length)}
        className="mt-4 gap-3"
      >
        <View className="flex-row gap-3">
          <StatTile
            label="Agents active"
            value={String(metrics.activeAgents)}
            count={{ to: metrics.activeAgents }}
            caption={metrics.totalAgents ? `of ${metrics.totalAgents}` : undefined}
            tone="success"
            index={0}
            onPress={() => router.push('/(root)/(tabs)/workforce' as never)}
          />
          <StatTile
            label="Tasks resolved"
            value={String(metrics.tasksResolved)}
            count={{ to: metrics.tasksResolved }}
            caption="today"
            tone="accent"
            index={1}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            label="Needs attention"
            value={String(metrics.attention)}
            count={{ to: metrics.attention }}
            caption="pending review"
            tone={metrics.attention > 0 ? 'warning' : 'neutral'}
            dot={metrics.attention > 0}
            index={2}
            onPress={() => router.push('/(root)/(tabs)/workforce' as never)}
          />
          <StatTile
            label="Spend today"
            value={fmtCurrency(metrics.spendToday)}
            count={{ to: metrics.spendToday, format: fmtCurrency }}
            tone="neutral"
            index={3}
          />
        </View>
      </Animated.View>
    </ScrollView>,
  );
}
