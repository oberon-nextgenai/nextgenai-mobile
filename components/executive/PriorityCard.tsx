import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';
import { Elevation } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Severity = 'critical' | 'attention' | 'info';

export interface PriorityCardProps {
  severity: Severity; // drives the left edge accent + icon + label
  eyebrow?: string; // e.g. "TOP PRIORITY" (uppercase tracked 10px)
  title: string; // headline, ~18px semibold
  detail?: string; // 1–2 line supporting text, muted
  recommendation?: string; // Prime's suggested action, shown in a subtle inset
  ctaLabel: string; // primary action label
  onPressCta: () => void;
  onPress?: () => void; // optional: tap whole card to open detail
}

const SEVERITY_ICON: Record<Severity, keyof typeof Ionicons.glyphMap> = {
  critical: 'alert-circle',
  attention: 'time',
  info: 'sparkles',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'CRITICAL',
  attention: 'NEEDS ATTENTION',
  info: 'FOR YOUR INFO',
};

// status color is paired with an icon + text label below — never color alone
const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-danger dark:text-danger-dark',
  attention: 'text-warning dark:text-warning-dark',
  info: 'text-accent-2 dark:text-accent-2-dark',
};

export function PriorityCard({
  severity,
  eyebrow,
  title,
  detail,
  recommendation,
  ctaLabel,
  onPressCta,
  onPress,
}: PriorityCardProps) {
  const { colors } = useThemeMode();
  const press = usePressScale({ to: 0.98, disabled: !onPress });

  const edgeColor =
    severity === 'critical'
      ? colors.danger
      : severity === 'attention'
        ? colors.warning
        : colors.accent2;

  const iconColor = edgeColor;

  const Inner = (
    <View className="flex-1 pl-4 pr-4 py-4">
      {/* Severity chip: colored icon + uppercase label (never color alone) */}
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={SEVERITY_ICON[severity]} size={16} color={iconColor} />
        <Text
          className={cn('text-[11px]', SEVERITY_TEXT[severity])}
          style={{ fontFamily: 'Inter_700Bold', letterSpacing: 0.6 }}
        >
          {SEVERITY_LABEL[severity]}
        </Text>
      </View>

      {eyebrow ? (
        <Text
          className="mt-2 text-fg-muted dark:text-fg-dark-muted"
          style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 }}
        >
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}

      <Text
        className={cn(
          'text-[18px] text-fg dark:text-fg-dark-DEFAULT',
          eyebrow ? 'mt-1' : 'mt-2',
        )}
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {title}
      </Text>

      {detail ? (
        <Text
          className="mt-1.5 text-[13px] leading-5 text-fg-muted dark:text-fg-dark-muted"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          {detail}
        </Text>
      ) : null}

      {recommendation ? (
        <View className="mt-3 rounded-3xl bg-surface-2 dark:bg-surface-2-dark p-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="sparkles" size={12} color={colors.accent2} />
            <Text
              className="text-[11px] text-accent-2 dark:text-accent-2-dark"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Prime suggests
            </Text>
          </View>
          <Text
            className="mt-1 text-[13px] leading-5 text-fg dark:text-fg-dark-DEFAULT"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {recommendation}
          </Text>
        </View>
      ) : null}

      <View className="mt-4">
        <Button
          variant="primary"
          fullWidth
          onPress={onPressCta}
          rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        >
          {ctaLabel}
        </Button>
      </View>
    </View>
  );

  const cardClassName =
    'flex-row overflow-hidden rounded-4xl bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-dark-subtle';

  const edgeBar = (
    <View style={{ width: 3, backgroundColor: edgeColor }} accessibilityElementsHidden />
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${SEVERITY_LABEL[severity]}: ${title}`}
        style={[press.animatedStyle, Elevation.sm]}
        className={cardClassName}
      >
        {edgeBar}
        {Inner}
      </AnimatedPressable>
    );
  }

  return (
    <View style={Elevation.sm} className={cardClassName}>
      {edgeBar}
      {Inner}
    </View>
  );
}
