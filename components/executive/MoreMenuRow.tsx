import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface MoreMenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress?: () => void;
  badge?: string; // small count/label pill on the right
  tone?: 'default' | 'muted'; // muted = disabled/"coming soon" look (lower opacity, no chevron)
  trailing?: 'chevron' | 'none';
}

export function MoreMenuRow({
  icon,
  label,
  description,
  onPress,
  badge,
  tone = 'default',
  trailing = 'chevron',
}: MoreMenuRowProps) {
  const { colors } = useThemeMode();
  const isMuted = tone === 'muted';
  const press = usePressScale({ disabled: isMuted });

  const showChevron = trailing === 'chevron' && !isMuted;

  return (
    <AnimatedPressable
      onPress={isMuted ? undefined : onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={8}
      disabled={isMuted}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isMuted }}
      style={press.animatedStyle}
      className={cn(
        'min-h-[44px] flex-row items-center gap-3 px-1 py-2.5',
        isMuted && 'opacity-50',
      )}
    >
      {/* Icon tile */}
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-soft-dark">
        <Ionicons name={icon} size={20} color={colors.accent2} />
      </View>

      {/* Label + description */}
      <View className="flex-1">
        <Text
          className="text-[15px] text-fg dark:text-fg-dark-DEFAULT"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            className="mt-0.5 text-xs text-fg-muted dark:text-fg-dark-muted"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {description}
          </Text>
        ) : null}
      </View>

      {/* Badge pill */}
      {badge ? (
        <View className="rounded-full bg-surface-2 dark:bg-surface-2-dark px-2 py-0.5">
          <Text
            className="text-[11px] text-fg-muted dark:text-fg-dark-muted"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {badge}
          </Text>
        </View>
      ) : null}

      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.fgSubtle} />
      ) : null}
    </AnimatedPressable>
  );
}
