import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  tone?: 'neutral' | 'positive' | 'warning' | 'negative';
  icon?: keyof typeof Ionicons.glyphMap;
  /** Tiny inline sparkline series (no axes). */
  sparkline?: number[];
  /** Size variant: hero (large, sparkline area) or compact (row). */
  variant?: 'hero' | 'compact';
}

const TONE_STROKE: Record<string, (c: ReturnType<typeof useThemeMode>['colors']) => string> = {
  neutral: (c) => c.accent,
  positive: (c) => c.success,
  warning: (c) => c.warning,
  negative: (c) => c.danger,
};

const TONE_TEXT: Record<string, string> = {
  neutral: 'text-fg dark:text-fg-dark-DEFAULT',
  positive: 'text-success',
  warning: 'text-warning',
  negative: 'text-danger',
};

export function MetricCard({
  label,
  value,
  delta,
  trend,
  tone = 'neutral',
  icon,
  sparkline,
  variant = 'hero',
}: MetricCardProps) {
  const { colors } = useThemeMode();
  const stroke = TONE_STROKE[tone](colors);
  const isCompact = variant === 'compact';

  return (
    <View
      className={cn(
        'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl',
        isCompact ? 'p-3 flex-1 min-w-[120px]' : 'p-4 flex-1',
      )}
    >
      <View className="flex-row items-center mb-1.5">
        {icon ? (
          <Ionicons
            name={icon}
            size={12}
            color={colors.fgMuted}
            style={{ marginRight: 6 }}
          />
        ) : null}
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
      </View>

      <Text
        className={cn(isCompact ? 'text-lg' : 'text-3xl', TONE_TEXT[tone])}
        style={{ fontFamily: 'Inter_700Bold' }}
      >
        {value}
      </Text>

      {delta != null || trend ? (
        <View className="flex-row items-center mt-1">
          {trend ? (
            <Ionicons
              name={
                trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'
              }
              size={11}
              color={
                trend === 'up'
                  ? colors.success
                  : trend === 'down'
                    ? colors.danger
                    : colors.fgMuted
              }
            />
          ) : null}
          {delta ? (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[11px] ml-1"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {delta}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!isCompact && sparkline && sparkline.length > 1 ? (
        <View className="-mx-2 mt-2" pointerEvents="none">
          <LineChart
            data={sparkline.map((v) => ({ value: v }))}
            areaChart
            height={36}
            width={140}
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
    </View>
  );
}
