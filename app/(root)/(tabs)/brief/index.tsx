import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
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
import { PrimeBriefCard } from '@/components/brief/PrimeBriefCard';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
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

  // The workspace's primary dashboard read is folded into the hero. Anything
  // after it — a second installed dashboard — keeps its own card.
  const [primaryBriefing, ...extraBriefings] = briefings;

  const onPressPriority = () => {
    router.push(
      topPriority?.agentId
        ? (`/(root)/(tabs)/workforce/${topPriority.agentId}` as never)
        : ('/(root)/(tabs)/workforce' as never),
    );
  };

  const openDashboard = () => router.push('/(root)/(tabs)/analytics' as never);

  const askPrime = (prompt?: string) =>
    router.push(
      prompt
        ? ({ pathname: '/(root)/(tabs)/prime', params: { prompt } } as never)
        : ('/(root)/(tabs)/prime' as never),
    );

  // One running counter, in render order. A block that does not render closes
  // the gap behind it rather than leaving a 50ms hole in the sweep, and two
  // blocks can never land on the same beat.
  let step = 0;
  const beat = () => step++;
  const greetingStep = beat();
  const heroStep = beat();
  const extraSteps = extraBriefings.map(() => beat());
  const unavailableSteps = unavailable.map(() => beat());
  const priorityStep = topPriority ? beat() : -1;
  const statsStep = beat();

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
      <Animated.View entering={enter(greetingStep)}>
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

      {/* One morning brief, not two: Prime's read and the workspace's primary
          dashboard briefing are the same statement, so they share the hero. With
          no briefing — none installed, still loading, or failed — this is the
          generic summary exactly as it was before. */}
      <Animated.View entering={enter(heroStep)} className="mt-5">
        <PrimeBriefCard
          summary={summary}
          briefing={primaryBriefing}
          onOpenDashboard={openDashboard}
          onAskPrime={askPrime}
        />
      </Animated.View>

      {/* A second installed dashboard keeps its own card. The registry is general
          on purpose; a workspace running two of them must not lose one. */}
      {extraBriefings.map((operational, i) => (
        <Animated.View key={operational.provider} entering={enter(extraSteps[i])} className="mt-4">
          <OperationalBriefCard
            briefing={operational}
            onOpenDashboard={openDashboard}
            onAskPrime={askPrime}
          />
        </Animated.View>
      ))}

      {/* A provider that exists but could not be read. Saying nothing here would
          render an unreachable database as a clean morning. */}
      {unavailable.map((item, i) => (
        <Animated.View key={item.provider} entering={enter(unavailableSteps[i])} className="mt-4">
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
        <Animated.View entering={enter(priorityStep)} className="mt-4">
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
          which count up from zero once — the screen's one deliberate moment.

          Captions come off the hook rather than being written here: two of these
          numbers cover a 7-day window and one covers 30, and a tile that says
          "today" over a week's figure is wrong every day it renders. */}
      <Animated.View entering={enter(statsStep)} className="mt-4 gap-3">
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
            caption={metrics.windowLabel}
            tone="accent"
            index={1}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            label="Needs attention"
            value={String(metrics.attention)}
            count={{ to: metrics.attention }}
            caption={metrics.attentionWindowLabel}
            tone={metrics.attention > 0 ? 'warning' : 'neutral'}
            dot={metrics.attention > 0}
            index={2}
            onPress={() => router.push('/(root)/(tabs)/workforce' as never)}
          />
          <StatTile
            label="Spend"
            value={fmtCurrency(metrics.spendToday)}
            count={{ to: metrics.spendToday, format: fmtCurrency }}
            caption={metrics.windowLabel}
            tone="neutral"
            index={3}
          />
        </View>
      </Animated.View>
    </ScrollView>,
  );
}
