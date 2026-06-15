import { ReactNode } from 'react';
import { Pressable, PressableProps, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PillTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

interface PillProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  tone?: PillTone;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  selected?: boolean;
  className?: string;
}

const TONE_BG: Record<PillTone, string> = {
  neutral: 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark',
  accent: 'bg-accent-soft dark:bg-accent-soft-dark border-accent dark:border-accent-dark',
  success: 'bg-success-soft dark:bg-success-soft border-success/40',
  warning: 'bg-warning-soft dark:bg-warning-soft border-warning/40',
  danger: 'bg-danger-soft dark:bg-danger-soft border-danger/40',
};
const TONE_FG: Record<PillTone, string> = {
  neutral: 'text-fg dark:text-fg-dark-DEFAULT',
  accent: 'text-accent dark:text-accent-dark',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function Pill({
  children,
  tone = 'neutral',
  leftIcon,
  rightIcon,
  selected,
  className,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PillProps) {
  const press = usePressScale({ onPressIn, onPressOut, disabled: !!disabled });
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={press.animatedStyle}
      className={cn(
        'flex-row items-center rounded-full px-3 py-1.5 border',
        TONE_BG[tone],
        selected && 'bg-accent border-accent dark:bg-accent-dark',
        className,
      )}
    >
      {leftIcon ? <View className="mr-1.5">{leftIcon}</View> : null}
      <Text
        className={cn(
          'text-xs font-medium',
          selected ? 'text-white' : TONE_FG[tone],
        )}
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {children}
      </Text>
      {rightIcon ? <View className="ml-1.5">{rightIcon}</View> : null}
    </AnimatedPressable>
  );
}
