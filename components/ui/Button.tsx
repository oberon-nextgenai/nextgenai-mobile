import { ReactNode } from 'react';
import { ActivityIndicator, PressableProps, View } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { PRESS_SPRING } from '@/hooks/usePressScale';
import { AnimatedPressable } from '@/lib/nativewindInterop';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline-danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-accent dark:bg-accent-dark border border-accent dark:border-accent-dark',
  secondary:
    'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark',
  ghost: 'bg-transparent',
  'outline-danger':
    'bg-surface dark:bg-surface-dark border border-danger',
};

const TEXT_TONE = {
  primary: 'onAccent',
  secondary: 'default',
  ghost: 'default',
  'outline-danger': 'danger',
} as const;

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-xl',
  md: 'px-4 py-3 rounded-2xl',
  lg: 'px-5 py-4 rounded-2xl',
};

const TEXT_SIZE: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { colors } = useThemeMode();
  const spinnerColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'outline-danger'
        ? colors.danger
        : colors.fg;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  /**
   * On the styled view, not the pressable around it: that view is the visible
   * button and owns the radius, so the shadow follows the rounded shape. The
   * pressable's box also grows with any margin a caller passes through
   * `className`, which put a shadow above the button as well as below it.
   */
  const shadow =
    variant === 'primary'
      ? {
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          shadowOpacity: 0.18,
          elevation: 2,
        }
      : undefined;

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      onPressIn={(e) => {
        scale.value = withSpring(0.96, PRESS_SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, PRESS_SPRING);
        onPressOut?.(e);
      }}
      style={animatedStyle}
      contentProps={shadow ? { style: shadow } : undefined}
      className={cn(
        'flex-row items-center justify-center',
        CONTAINER[variant],
        SIZE[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-60',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon}
          <Text variant="body.semibold" tone={TEXT_TONE[variant]} style={{ fontSize: TEXT_SIZE[size] }}>
            {children}
          </Text>
          {rightIcon}
        </View>
      )}
    </AnimatedPressable>
  );
}
