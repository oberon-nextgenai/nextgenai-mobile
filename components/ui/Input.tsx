import { forwardRef, ReactNode, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';
import { Type } from '@/constants/Typography';
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
    style,
    ...rest
  },
  ref,
) {
  const { colors } = useThemeMode();
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? (
        <Text variant="body.xs" tone="muted">
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
          className={cn('flex-1 py-3', className)}
          // TextInput is not the Text primitive, so the type role is spread directly.
          style={[Type.body.lg, { color: colors.fg }, style]}
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
        <Text variant="body.xs" tone="danger" className="mt-0.5">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
