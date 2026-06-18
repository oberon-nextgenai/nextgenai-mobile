import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { cn } from '@/lib/cn';
import { Elevation } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AgentStatus = 'healthy' | 'attention' | 'paused' | 'critical';

interface StatusMeta {
  label: string;
  colorClassText: string;
  /** Resolver from the active palette to an inline color. */
  color: (c: ReturnType<typeof useThemeMode>['colors']) => string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * Single source of truth for how an agent status renders. Screens reuse this so
 * status is always color + icon + label (never color alone).
 */
export function statusMeta(status: AgentStatus): StatusMeta {
  switch (status) {
    case 'healthy':
      return {
        label: 'Healthy',
        colorClassText: 'text-success dark:text-success-dark',
        color: (c) => c.success,
        icon: 'checkmark-circle',
      };
    case 'attention':
      return {
        label: 'Needs attention',
        colorClassText: 'text-warning dark:text-warning-dark',
        color: (c) => c.warning,
        icon: 'alert-circle',
      };
    case 'paused':
      return {
        label: 'Paused',
        colorClassText: 'text-fg-subtle dark:text-fg-dark-subtle',
        color: (c) => c.fgSubtle,
        icon: 'pause-circle',
      };
    case 'critical':
      return {
        label: 'Critical',
        colorClassText: 'text-danger dark:text-danger-dark',
        color: (c) => c.danger,
        icon: 'warning',
      };
  }
}

interface AgentHealthRowProps {
  name: string;
  role?: string; // e.g. "Voice • Intake"
  status: AgentStatus;
  performancePct?: number; // 0–100
  costPerRun?: number; // dollars
  trend?: number[]; // sparkline series
  onPress?: () => void;
}

export function AgentHealthRow({
  name,
  role,
  status,
  performancePct,
  costPerRun,
  trend,
  onPress,
}: AgentHealthRowProps) {
  const { colors } = useThemeMode();
  const press = usePressScale({ to: 0.98 });
  const meta = statusMeta(status);
  const stroke = meta.color(colors);

  const a11yLabel = [
    name,
    role,
    meta.label,
    performancePct != null ? `${Math.round(performancePct)}% performance` : null,
    costPerRun != null ? `$${costPerRun.toFixed(2)} per run` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const showSparkline = Array.isArray(trend) && trend.length > 1;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[press.animatedStyle, Elevation.sm]}
      className={cn(
        'flex-row items-center min-h-[64px] px-4 py-3 gap-3 rounded-3xl',
        'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark',
      )}
    >
      {/* Status icon */}
      <Ionicons name={meta.icon} size={22} color={stroke} />

      {/* Name / role / status label */}
      <View className="flex-1 min-w-0">
        <Text
          numberOfLines={1}
          className="text-fg dark:text-fg-dark-DEFAULT text-[15px]"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          {name}
        </Text>
        {role ? (
          <Text
            numberOfLines={1}
            className="text-fg-muted dark:text-fg-dark-muted text-[12px] mt-0.5"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {role}
          </Text>
        ) : null}
        <View className="flex-row items-center mt-0.5">
          <Ionicons name={meta.icon} size={11} color={stroke} style={{ marginRight: 4 }} />
          <Text
            numberOfLines={1}
            className={cn('text-[11px]', meta.colorClassText)}
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {meta.label}
          </Text>
        </View>
      </View>

      {/* Performance % */}
      {performancePct != null ? (
        <View className="items-end">
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-[15px]"
            style={{ fontFamily: 'Inter_700Bold' }}
          >
            {Math.round(performancePct)}%
          </Text>
          <Text
            className="text-fg-subtle dark:text-fg-dark-subtle text-[9px] uppercase tracking-widest"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            perf
          </Text>
          {costPerRun != null ? (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[11px] mt-0.5"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              ${costPerRun.toFixed(2)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Sparkline — fixed box that can shrink on tight widths */}
      {showSparkline ? (
        <View
          pointerEvents="none"
          className="w-[88px] max-w-[88px] overflow-hidden"
          style={{ height: 28 }}
        >
          <LineChart
            data={trend!.map((v) => ({ value: v }))}
            areaChart
            height={28}
            width={88}
            color={stroke}
            startFillColor={stroke}
            endFillColor={stroke}
            startOpacity={0.22}
            endOpacity={0.02}
            thickness={1.6}
            hideRules
            hideDataPoints
            hideYAxisText
            hideAxesAndRules
            disableScroll
            isAnimated={false}
            initialSpacing={0}
            endSpacing={0}
            yAxisLabelWidth={0}
          />
        </View>
      ) : null}

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={18} color={colors.fgSubtle} />
    </AnimatedPressable>
  );
}
