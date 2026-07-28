import { ReactNode } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leftIcon?: ReactNode;
  className?: string;
}

/**
 * Filter chip used on Agents tab. Selected = indigo filled; unselected =
 * white surface with thin border. Pressed state subtly tints the surface.
 */
export function Chip({ label, selected, onPress, leftIcon, className }: ChipProps) {
  const press = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={press.animatedStyle}
      className={cn(
        'flex-row items-center rounded-full px-3 py-1.5 border',
        selected
          ? 'bg-accent border-accent dark:bg-accent-dark dark:border-accent-dark'
          : 'bg-surface border-border dark:bg-surface-dark dark:border-border-dark',
        className,
      )}
    >
      {leftIcon}
      <Text
        variant="body.sm"
        tone={selected ? 'onAccent' : 'default'}
        className={leftIcon ? 'ml-1.5' : undefined}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
