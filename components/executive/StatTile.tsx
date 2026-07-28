import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Type } from '@/constants/Typography';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';
import { Sparkline } from '@/components/ui/Sparkline';
import { CountUp } from '@/components/ui/CountUp';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type StatTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/** Opt-in count-up for the tile's value. See `StatTileProps.count`. */
export interface StatTileCount {
  /** The number behind `value`. Nullish — no data yet — renders `value` verbatim. */
  to?: number | null;
  /** The formatter that produced `value`. Defaults to a rounded integer. */
  format?: (n: number) => string;
}

interface StatTileProps {
  /** Mono uppercase eyebrow — AGENTS ACTIVE, SPEND TODAY. */
  label: string;
  /** The number itself, pre-formatted. Set in serif — this is what gets read. */
  value: string;
  /** Supporting line beneath the value — "of 16", "today · 87%", "pending review". */
  caption?: string;
  /** Optional trend series. Bleeds to the bottom edge of the tile. */
  trend?: number[];
  /**
   * Opt in to counting the value up from zero on first paint. Purely additive:
   * without it the tile renders `value` exactly as before, and `value` stays the
   * source of truth for the accessibility label so a screen reader always hears
   * the final number rather than a frame of the animation.
   */
  count?: StatTileCount;
  tone?: StatTone;
  /** Small dot beside the value, for tiles that carry a state (escalations pending). */
  dot?: boolean;
  onPress?: () => void;
  /** Stagger index, so a grid of tiles draws in sequence rather than at once. */
  index?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * A single tile from the 2×2 stat grid on the Brief and Analytics screens.
 *
 * The deck's move, and the reason this is not a generic MetricCard: the label is
 * mono, the value is serif, and the sparkline runs to the tile's edges with no
 * padding. That last part is what makes the grid read as instrumentation rather
 * than as four cards with charts in them.
 */
export function StatTile({
  label,
  value,
  caption,
  trend,
  count,
  tone = 'neutral',
  dot,
  onPress,
  index = 0,
  className,
  children,
}: StatTileProps) {
  const { colors } = useThemeMode();
  const press = usePressScale();

  // Only count when there is a real number behind the string. Until the data
  // lands, `value` is a placeholder ("—") and is rendered as-is.
  const countTo = count?.to != null && Number.isFinite(count.to) ? count.to : null;

  const toneColor = {
    neutral: colors.accent2,
    accent: colors.accent2,
    success: colors.successBright,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  const Container = onPress ? AnimatedPressable : View;
  const pressProps = onPress
    ? {
        onPress,
        onPressIn: press.onPressIn,
        onPressOut: press.onPressOut,
        style: press.animatedStyle,
        accessibilityRole: 'button' as const,
        accessibilityLabel: `${label}, ${value}${caption ? `, ${caption}` : ''}`,
      }
    : {};

  return (
    <Container
      {...pressProps}
      className={cn(
        'flex-1 overflow-hidden rounded-xl border',
        'bg-surface border-border dark:bg-surface-dark dark:border-border-dark',
        className,
      )}
    >
      <View className="px-3.5 pt-3.5 pb-2">
        <Text style={[Type.mono.label, { color: colors.fgSubtle }]} numberOfLines={1}>
          {label}
        </Text>

        <View className="mt-1.5 flex-row items-center">
          {countTo != null ? (
            // Same cadence as the tile's sparkline, so a tile's numeral and its
            // line move together rather than as two separate events.
            <CountUp
              value={countTo}
              format={count?.format}
              delay={index * 70}
              variant="display.md"
              numberOfLines={1}
            />
          ) : (
            <Text style={[Type.display.md, { color: colors.fg }]} numberOfLines={1}>
              {value}
            </Text>
          )}
          {dot ? (
            <View
              className="ml-1.5 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: toneColor }}
            />
          ) : null}
        </View>

        {caption ? (
          <Text style={[Type.mono.sm, { color: colors.fgSubtle, marginTop: 2 }]} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}

        {children}
      </View>

      {/* No horizontal padding — the line is meant to touch both edges. */}
      {trend && trend.length > 1 ? (
        <Sparkline values={trend} color={toneColor} height={34} delay={index * 70} />
      ) : (
        // Reserve the space so tiles with and without a trend stay the same
        // height and the grid never reflows once data arrives.
        <View style={{ height: 34 }} />
      )}
    </Container>
  );
}
