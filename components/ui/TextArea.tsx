import { forwardRef, useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';
import { Type } from '@/constants/Typography';
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
        <Text variant="body.xs" tone="muted">
          {label}
        </Text>
      ) : null}
      {description ? (
        <Text variant="body.xs" tone="subtle">
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
          'bg-surface dark:bg-surface-dark border rounded-lg px-3.5 py-3',
          focused
            ? 'border-accent dark:border-accent-dark'
            : 'border-border dark:border-border-dark',
          error && 'border-danger',
          className,
        )}
        // TextInput is not the Text primitive, so the type role is spread
        // directly. `mono.code` is the role that replaces the old 'Menlo'.
        style={[
          monospace ? Type.mono.code : Type.body.lg,
          { color: colors.fg, minHeight: 24 * minLines },
          style,
        ]}
      />
      {error ? (
        <Text variant="body.xs" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
