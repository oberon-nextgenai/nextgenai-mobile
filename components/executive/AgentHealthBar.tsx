import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';
import type { AgentStatus } from './AgentHealthRow';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AgentHealthBarProps {
  healthy: number;
  attention: number;
  paused: number;
  critical?: number;
  /** Shown as the mono `UPDATED HH:MM` stamp. Defaults to now. */
  updatedAt?: Date;
  onPressSegment?: (status: AgentStatus) => void;
}

type Segment = {
  status: AgentStatus;
  count: number;
  label: string;
  color: string;
  tone: 'success' | 'warning' | 'danger' | 'subtle';
};

/** Each segment grows from zero on mount — the bar draws itself in. */
function BarSegment({ segment, index }: { segment: Segment; index: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      index * 90,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, index, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: segment.count * progress.value,
  }));

  return <Animated.View style={[animatedStyle, { backgroundColor: segment.color }]} />;
}

/**
 * Fleet health: one bar split by status, with the counts spelled out beneath it.
 *
 * A single bar rather than four numbers because the question a CEO is asking here
 * is a proportion — "how much of my workforce is fine" — and a proportion is
 * read faster from length than from arithmetic.
 */
export function AgentHealthBar({
  healthy,
  attention,
  paused,
  critical = 0,
  updatedAt,
  onPressSegment,
}: AgentHealthBarProps) {
  const { colors } = useThemeMode();

  const segments: Segment[] = [
    { status: 'healthy', count: healthy, label: 'healthy', color: colors.successBright, tone: 'success' },
    { status: 'attention', count: attention, label: 'attention', color: colors.warning, tone: 'warning' },
    { status: 'critical', count: critical, label: 'critical', color: colors.danger, tone: 'danger' },
    { status: 'paused', count: paused, label: 'paused', color: colors.fgSubtle, tone: 'subtle' },
  ];

  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const stamp = (updatedAt ?? new Date()).toTimeString().slice(0, 5);

  return (
    <Card gloss>
      <View className="flex-row items-center justify-between">
        <Text variant="mono.label" tone="subtle">
          Fleet health
        </Text>
        <Text variant="mono.label" tone="subtle">{`Updated ${stamp}`}</Text>
      </View>

      <View
        className="mt-3 flex-row w-full overflow-hidden rounded-full"
        style={{ height: 8, backgroundColor: colors.surface2 }}
        accessibilityRole="progressbar"
        accessibilityLabel={
          total === 0
            ? 'No agents yet'
            : `Workforce health: ${healthy} healthy, ${attention} need attention, ${critical} critical, ${paused} paused`
        }
      >
        {total > 0
          ? segments
              .filter(s => s.count > 0)
              .map((s, i) => <BarSegment key={s.status} segment={s} index={i} />)
          : null}
      </View>

      {total === 0 ? (
        <Text variant="body.sm" tone="muted" className="mt-3">
          No agents yet
        </Text>
      ) : (
        <View className="mt-3 flex-row items-center justify-between">
          {segments
            .filter(s => s.count > 0)
            .map(s => (
              <LegendItem key={s.status} segment={s} onPress={onPressSegment} />
            ))}
        </View>
      )}
    </Card>
  );
}

function LegendItem({
  segment,
  onPress,
}: {
  segment: Segment;
  onPress?: (status: AgentStatus) => void;
}) {
  const pressable = !!onPress;
  const press = usePressScale({ to: 0.96, disabled: !pressable });

  const content = (
    <Text variant="mono.sm" tone={segment.tone === 'subtle' ? 'subtle' : segment.tone}>
      {`${segment.count} ${segment.label}`}
    </Text>
  );

  if (!pressable) return content;

  return (
    <AnimatedPressable
      onPress={() => onPress?.(segment.status)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${segment.count} ${segment.label}`}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      style={press.animatedStyle}
    >
      {content}
    </AnimatedPressable>
  );
}
