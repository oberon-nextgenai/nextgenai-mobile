import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface MoreMenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Mono metadata beneath the label — "14 active agents", "Ask · brief · plan". */
  description?: string;
  onPress?: () => void;
  /** Count pill on the right. */
  badge?: string;
  /** `muted` = not available yet: dimmed, unpressable, no chevron. */
  tone?: 'default' | 'muted';
  trailing?: 'chevron' | 'none';
  /** Highlights the row the user is currently on. */
  active?: boolean;
}

/**
 * A navigation row in the drawer.
 *
 * The subtitle is mono and carries live state — how many agents, how many
 * decisions waiting — so the menu answers "what needs me?" before you tap
 * anything. That is the whole reason the drawer is worth opening.
 */
export function MoreMenuRow({
  icon,
  label,
  description,
  onPress,
  badge,
  tone = 'default',
  trailing = 'chevron',
  active,
}: MoreMenuRowProps) {
  const { colors } = useThemeMode();
  const isMuted = tone === 'muted';
  const press = usePressScale({ disabled: isMuted });

  return (
    <AnimatedPressable
      onPress={isMuted ? undefined : onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={6}
      disabled={isMuted}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isMuted, selected: !!active }}
      style={[press.animatedStyle, active ? { backgroundColor: colors.chipSelectedBg } : null]}
      className={cn(
        'min-h-[52px] flex-row items-center gap-3 rounded-xl px-3 py-2.5',
        isMuted && 'opacity-45',
      )}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: active ? colors.accent : colors.surface2 }}
      >
        <Ionicons name={icon} size={17} color={active ? '#FFFFFF' : colors.accent2} />
      </View>

      <View className="flex-1 min-w-0">
        <Text variant="body.medium" numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text variant="mono.sm" tone="subtle" numberOfLines={1} className="mt-0.5">
            {description}
          </Text>
        ) : null}
      </View>

      {badge ? (
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger }}
        >
          <Text variant="mono.label" tone="danger">
            {badge}
          </Text>
        </View>
      ) : null}

      {trailing === 'chevron' && !isMuted ? (
        <Ionicons name="chevron-forward" size={16} color={colors.fgSubtle} />
      ) : null}
    </AnimatedPressable>
  );
}
