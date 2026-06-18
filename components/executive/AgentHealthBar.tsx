import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Elevation } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';
import type { AgentStatus } from './AgentHealthRow';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AgentHealthBarProps {
  healthy: number;
  attention: number;
  paused: number;
  critical?: number;
  onPressSegment?: (status: AgentStatus) => void;
}

type Segment = {
  status: AgentStatus;
  count: number;
  label: string;
  color: string;
};

function LegendItem({
  segment,
  onPress,
}: {
  segment: Segment;
  onPress?: (status: AgentStatus) => void;
}) {
  const dim = segment.count === 0;
  const pressable = !!onPress;
  const press = usePressScale({ to: 0.96, disabled: !pressable });

  const content = (
    <>
      <View
        className="w-2.5 h-2.5 rounded-full mr-1.5"
        style={{ backgroundColor: segment.color, opacity: dim ? 0.45 : 1 }}
      />
      <Text
        className="text-fg dark:text-fg-dark-DEFAULT text-[13px] mr-1"
        style={{ fontFamily: 'Inter_600SemiBold', opacity: dim ? 0.45 : 1 }}
      >
        {segment.count}
      </Text>
      <Text
        className="text-fg-muted dark:text-fg-dark-muted text-[12px]"
        style={{ fontFamily: 'Inter_400Regular', opacity: dim ? 0.45 : 1 }}
      >
        {segment.label}
      </Text>
    </>
  );

  if (!pressable) {
    return <View className="flex-row items-center">{content}</View>;
  }

  return (
    <AnimatedPressable
      onPress={() => onPress?.(segment.status)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${segment.count} ${segment.label}`}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      style={press.animatedStyle}
      className="flex-row items-center"
    >
      {content}
    </AnimatedPressable>
  );
}

export function AgentHealthBar({
  healthy,
  attention,
  paused,
  critical = 0,
  onPressSegment,
}: AgentHealthBarProps) {
  const { colors } = useThemeMode();

  const segments: Segment[] = [
    { status: 'healthy', count: healthy, label: 'healthy', color: colors.success },
    { status: 'attention', count: attention, label: 'needs attention', color: colors.warning },
    { status: 'paused', count: paused, label: 'paused', color: colors.fgSubtle },
    { status: 'critical', count: critical, label: 'critical', color: colors.danger },
  ];

  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <View
      style={Elevation.sm}
      className={cn(
        'rounded-3xl p-4',
        'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark',
      )}
    >
      {/* Proportional stacked bar */}
      <View
        className="flex-row w-full overflow-hidden rounded-full bg-surface-2 dark:bg-surface-2-dark"
        style={{ height: 10 }}
        accessibilityRole="progressbar"
        accessibilityLabel={
          total === 0
            ? 'No agents yet'
            : `Workforce health: ${healthy} healthy, ${attention} need attention, ${paused} paused, ${critical} critical`
        }
      >
        {total > 0
          ? segments
              .filter((s) => s.count > 0)
              .map((s) => (
                <View
                  key={s.status}
                  style={{ flex: s.count, backgroundColor: s.color }}
                />
              ))
          : null}
      </View>

      {total === 0 ? (
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[12px] mt-3"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          No agents yet
        </Text>
      ) : (
        <View className="flex-row flex-wrap items-center mt-3 gap-x-4 gap-y-2">
          {segments.map((s) => (
            <LegendItem key={s.status} segment={s} onPress={onPressSegment} />
          ))}
        </View>
      )}
    </View>
  );
}
