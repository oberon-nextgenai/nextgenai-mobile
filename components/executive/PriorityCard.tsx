import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Text, type TextTone } from '@/components/ui/Text';
import { GradientButton } from '@/components/ui/GradientButton';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Severity = 'critical' | 'attention' | 'info';

export interface PriorityCardProps {
  severity: Severity;
  /** Mono uppercase line under the severity — what kind of item this is. */
  eyebrow?: string;
  title: string;
  detail?: string;
  /** Prime's suggested action, shown in an inset. */
  recommendation?: string;
  ctaLabel: string;
  onPressCta: () => void;
  /** Optional whole-card tap target. */
  onPress?: () => void;
  /** Reference shown top-right in mono — an escalation id, an SLA countdown. */
  reference?: string;
}

const SEVERITY: Record<Severity, { icon: keyof typeof Ionicons.glyphMap; label: string; tone: TextTone }> =
  {
    critical: { icon: 'alert-circle', label: 'Critical', tone: 'danger' },
    attention: { icon: 'time', label: 'Needs attention', tone: 'warning' },
    info: { icon: 'sparkles', label: 'For your info', tone: 'accent' },
  };

/**
 * The one thing on a screen that is asking for a decision.
 *
 * Carries a left severity rail rather than a coloured background so it reads as
 * urgent without shouting — and so several can stack in a queue without the
 * screen becoming a wall of colour. Severity is always rail + icon + word, never
 * colour alone.
 */
export function PriorityCard({
  severity,
  eyebrow,
  title,
  detail,
  recommendation,
  ctaLabel,
  onPressCta,
  onPress,
  reference,
}: PriorityCardProps) {
  const { colors } = useThemeMode();
  const press = usePressScale({ to: 0.985, disabled: !onPress });
  const meta = SEVERITY[severity];

  const rail =
    severity === 'critical' ? colors.danger : severity === 'attention' ? colors.warning : colors.accent2;

  const body = (
    <Card rail={rail} gloss>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name={meta.icon} size={13} color={rail} />
          <Text variant="mono.label" tone={meta.tone}>
            {meta.label}
          </Text>
          {eyebrow ? (
            <Text variant="mono.label" tone="subtle">
              {`· ${eyebrow}`}
            </Text>
          ) : null}
        </View>
        {reference ? (
          <Text variant="mono.label" tone="subtle">
            {reference}
          </Text>
        ) : null}
      </View>

      <Text variant="body.lg" className="mt-2.5">
        {title}
      </Text>

      {detail ? (
        <Text variant="body.sm" tone="muted" className="mt-1.5">
          {detail}
        </Text>
      ) : null}

      {recommendation ? (
        <View className="mt-3 rounded-xl p-3" style={{ backgroundColor: colors.surface2 }}>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sparkles" size={11} color={colors.accent2} />
            <Text variant="mono.label" tone="accent">
              Prime recommends
            </Text>
          </View>
          <Text variant="body.sm" className="mt-1.5">
            {recommendation}
          </Text>
        </View>
      ) : null}

      <View className="mt-4">
        <GradientButton
          fullWidth
          onPress={onPressCta}
          rightIcon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
        >
          {ctaLabel}
        </GradientButton>
      </View>
    </Card>
  );

  if (!onPress) return body;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${title}`}
      style={press.animatedStyle}
    >
      {body}
    </AnimatedPressable>
  );
}
