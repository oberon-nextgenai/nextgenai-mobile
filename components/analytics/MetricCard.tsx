import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text, type TextTone } from '@/components/ui/Text';
import { Sparkline } from '@/components/ui/Sparkline';
import { useThemeMode } from '@/hooks/useThemeMode';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  tone?: 'neutral' | 'positive' | 'warning' | 'negative';
  icon?: keyof typeof Ionicons.glyphMap;
  /** Series for the inline sparkline. Rendered on the `hero` variant only. */
  sparkline?: number[];
  variant?: 'hero' | 'compact';
}

const TONE_TEXT: Record<string, TextTone> = {
  neutral: 'default',
  positive: 'success',
  warning: 'warning',
  negative: 'danger',
};

/**
 * A labelled figure. Mono label, serif value — the same pairing as `StatTile`,
 * which this shares a visual language with but not a layout: `StatTile` is built
 * for the 2×2 executive grid, `MetricCard` for mixed analytics rows.
 */
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
  const isCompact = variant === 'compact';

  const stroke = {
    neutral: colors.accent2,
    positive: colors.successBright,
    warning: colors.warning,
    negative: colors.danger,
  }[tone];

  const showSparkline = !isCompact && sparkline && sparkline.length > 1;

  return (
    <Card padding="none" className={isCompact ? 'flex-1 min-w-[120px]' : 'flex-1'}>
      <View className={isCompact ? 'p-3' : 'p-4'}>
        <View className="flex-row items-center">
          {icon ? (
            <Ionicons name={icon} size={11} color={colors.fgSubtle} style={{ marginRight: 6 }} />
          ) : null}
          <Text variant="mono.label" tone="subtle" numberOfLines={1}>
            {label}
          </Text>
        </View>

        <Text
          variant={isCompact ? 'display.md' : 'display.xl'}
          tone={TONE_TEXT[tone]}
          numberOfLines={1}
          className="mt-1.5"
        >
          {value}
        </Text>

        {delta != null || trend ? (
          <View className="flex-row items-center mt-1">
            {trend ? (
              <Ionicons
                name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                size={11}
                color={
                  trend === 'up' ? colors.successBright : trend === 'down' ? colors.danger : colors.fgSubtle
                }
              />
            ) : null}
            {delta ? (
              <Text variant="mono.sm" tone="subtle" className={trend ? 'ml-1.5' : undefined}>
                {delta}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {showSparkline ? <Sparkline values={sparkline} color={stroke} height={36} /> : null}
    </Card>
  );
}
