import { forwardRef, ReactNode, useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPressRightIcon?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    containerClassName,
    className,
    leftIcon,
    rightIcon,
    onPressRightIcon,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const { colors } = useThemeMode();
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? (
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-xs font-medium tracking-wide"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
      ) : null}
      <View
        className={cn(
          'flex-row items-center bg-surface dark:bg-surface-dark border rounded-2xl px-3.5',
          focused
            ? 'border-accent dark:border-accent-dark'
            : 'border-border dark:border-border-dark',
          error && 'border-danger',
        )}
      >
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.fgSubtle}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            'flex-1 text-fg dark:text-fg-dark-DEFAULT text-[15px] py-3',
            className,
          )}
          style={{ fontFamily: 'Inter_400Regular' }}
        />
        {rightIcon ? (
          <Pressable
            onPress={onPressRightIcon}
            disabled={!onPressRightIcon}
            className="ml-2 p-1"
          >
            {rightIcon}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="text-danger text-xs mt-0.5">{error}</Text>
      ) : null}
    </View>
  );
});
