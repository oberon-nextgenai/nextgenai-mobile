import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import { PRESS_SPRING } from '@/hooks/usePressScale';

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-accent dark:bg-accent-dark border border-accent dark:border-accent-dark',
  secondary:
    'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark',
  ghost: 'bg-transparent',
  'outline-danger':
    'bg-surface dark:bg-surface-dark border border-danger',
};

const TEXT: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-fg dark:text-fg-dark-DEFAULT',
  ghost: 'text-fg dark:text-fg-dark-DEFAULT',
  'outline-danger': 'text-danger',
};

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-xl',
  md: 'px-4 py-3 rounded-2xl',
  lg: 'px-5 py-4 rounded-3xl',
};

const TEXT_SIZE: Record<Size, string> = {
  sm: 'text-sm font-medium',
  md: 'text-[15px] font-semibold',
  lg: 'text-base font-semibold',
};

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
  const shadowOpacity = useSharedValue(variant === 'primary' ? 0.18 : 0);
  const restShadow = variant === 'primary' ? 0.18 : 0;
  const pressedShadow = variant === 'primary' ? 0.32 : 0.1;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      onPressIn={(e) => {
        scale.value = withSpring(0.96, PRESS_SPRING);
        shadowOpacity.value = withTiming(pressedShadow, { duration: 80 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, PRESS_SPRING);
        shadowOpacity.value = withTiming(restShadow, { duration: 140 });
        onPressOut?.(e);
      }}
      style={[
        animatedStyle,
        variant === 'primary'
          ? {
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 2,
            }
          : null,
      ]}
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
          <Text
            className={cn(TEXT[variant], TEXT_SIZE[size])}
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {children}
          </Text>
          {rightIcon}
        </View>
      )}
    </AnimatedPressable>
  );
}
