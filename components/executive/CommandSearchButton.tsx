import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CommandSearchButtonProps {
  onPress: () => void;
  compact?: boolean;
}

export function CommandSearchButton({ onPress, compact = true }: CommandSearchButtonProps) {
  const { colors } = useThemeMode();
  const press = usePressScale();

  const shared = {
    onPress,
    onPressIn: press.onPressIn,
    onPressOut: press.onPressOut,
    hitSlop: 8,
    accessibilityRole: 'button' as const,
    accessibilityLabel: 'Open command search',
  };

  if (compact) {
    return (
      <AnimatedPressable
        {...shared}
        style={press.animatedStyle}
        className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle"
      >
        <Ionicons name="search" size={18} color={colors.fgMuted} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      {...shared}
      style={press.animatedStyle}
      className={cn(
        'min-h-[44px] flex-row items-center gap-2 rounded-full px-4 py-2.5',
        'bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle',
      )}
    >
      <Ionicons name="search" size={18} color={colors.fgMuted} />
      <Text
        className="flex-1 text-[15px] text-fg-muted dark:text-fg-dark-muted"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        Search agents, actions…
      </Text>
    </AnimatedPressable>
  );
}
