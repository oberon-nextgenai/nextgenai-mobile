import { forwardRef, useState } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';

interface TextAreaProps extends Omit<TextInputProps, 'multiline'> {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
  /** Use a monospace font (system-prompt editor, JSON, etc.). */
  monospace?: boolean;
  /** Min visible lines (default 4). */
  minLines?: number;
}

export const TextArea = forwardRef<TextInput, TextAreaProps>(function TextArea(
  {
    label,
    description,
    error,
    containerClassName,
    className,
    monospace,
    minLines = 4,
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
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-xs tracking-wide"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
      ) : null}
      {description ? (
        <Text
          className="text-fg-subtle dark:text-fg-dark-subtle text-xs"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          {description}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
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
          'bg-surface dark:bg-surface-dark border rounded-lg px-3.5 py-3 text-fg dark:text-fg-dark-DEFAULT text-[15px] leading-5',
          focused
            ? 'border-accent dark:border-accent-dark'
            : 'border-border dark:border-border-dark',
          error && 'border-danger',
          className,
        )}
        style={[
          {
            minHeight: 24 * minLines,
            fontFamily: monospace ? 'Menlo' : 'Inter_400Regular',
          },
          style,
        ]}
      />
      {error ? <Text className="text-danger text-xs">{error}</Text> : null}
    </View>
  );
});
