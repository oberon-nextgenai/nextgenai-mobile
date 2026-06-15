import { Pressable, PressableProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: keyof typeof Ionicons.glyphMap;
  size?: 28 | 32 | 36 | 40;
  variant?: 'surface' | 'ghost' | 'accent';
  className?: string;
  badge?: boolean;
}

const SIZE_PX: Record<number, number> = { 28: 28, 32: 32, 36: 36, 40: 40 };
const ICON_SIZE: Record<number, number> = { 28: 14, 32: 16, 36: 18, 40: 20 };

export function IconButton({
  icon,
  size = 36,
  variant = 'surface',
  className,
  badge,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: IconButtonProps) {
  const { colors } = useThemeMode();
  const color = variant === 'accent' ? '#FFFFFF' : colors.fg;
  const px = SIZE_PX[size];
  const ic = ICON_SIZE[size];
  const press = usePressScale({ onPressIn, onPressOut, disabled: !!disabled });
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      hitSlop={8}
      className={cn(
        'items-center justify-center rounded-full',
        variant === 'surface' &&
          'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark active:bg-accent-soft',
        variant === 'ghost' && 'active:bg-accent-soft dark:active:bg-accent-soft-dark',
        variant === 'accent' && 'bg-accent dark:bg-accent-dark active:opacity-90',
        className,
      )}
      style={[press.animatedStyle, { width: px, height: px }]}
    >
      <Ionicons name={icon} size={ic} color={color} />
      {badge ? (
        <View
          className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger"
        />
      ) : null}
    </AnimatedPressable>
  );
}
