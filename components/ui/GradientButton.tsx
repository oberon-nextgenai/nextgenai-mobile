import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Type } from '@/constants/Typography';
import { useThemeMode } from '@/hooks/useThemeMode';
import { PRESS_SPRING } from '@/hooks/usePressScale';

type Tone = 'accent' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface GradientButtonProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  /** `accent` = the violet primary CTA. `success` = the green approve/confirm CTA. */
  tone?: Tone;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-xl',
  md: 'px-4 py-3 rounded-2xl',
  lg: 'px-5 py-4 rounded-2xl',
};

const TEXT_SIZE: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

/**
 * The deck's primary call to action: a left→right gradient fill rather than the
 * flat accent used by `Button`. Reserved for the one committing action on a
 * screen — "Review escalations", "Approve takeover", "Send to board".
 *
 * Everything secondary alongside it stays on `Button variant="secondary"`, which
 * is what gives the gradient its weight. Two gradients on one screen and neither reads
 * as the primary action.
 */
export function GradientButton({
  children,
  tone = 'accent',
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
}: GradientButtonProps) {
  const isDisabled = disabled || loading;
  const { colors } = useThemeMode();
  const gradient = tone === 'success' ? colors.successGradient : colors.accentGradient;

  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.18);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPressIn={(e) => {
        scale.value = withSpring(0.96, PRESS_SPRING);
        shadowOpacity.value = withTiming(0.32, { duration: 80 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, PRESS_SPRING);
        shadowOpacity.value = withTiming(0.18, { duration: 140 });
        onPressOut?.(e);
      }}
      style={[
        animatedStyle,
        {
          shadowColor: gradient[0],
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 3,
        },
      ]}
      className={cn('overflow-hidden', SIZE[size], fullWidth && 'w-full', isDisabled && 'opacity-60', className)}
    >
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        // Fills the Pressable, which owns the radius and clips it.
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon}
          <Text style={[Type.body.semibold, { fontSize: TEXT_SIZE[size], color: '#FFFFFF' }]}>{children}</Text>
          {rightIcon}
        </View>
      )}
    </AnimatedPressable>
  );
}
