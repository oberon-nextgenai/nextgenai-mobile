import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/cn';

interface ChipInputProps {
  label?: string;
  description?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  validate?: (input: string) => boolean;
  className?: string;
}

/**
 * Comma- or Enter-separated chip input. Used for the daily-report
 * `reportEmails` field and any future tag-style inputs.
 */
export function ChipInput({
  label,
  description,
  values,
  onChange,
  placeholder = 'Type and press Enter',
  validate,
  className,
}: ChipInputProps) {
  const { colors } = useThemeMode();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const commit = (raw: string) => {
    const trimmed = raw.trim().replace(/,$/, '');
    if (!trimmed) return;
    if (validate && !validate(trimmed)) return;
    if (values.includes(trimmed)) {
      setText('');
      return;
    }
    onChange([...values, trimmed]);
    setText('');
  };

  return (
    <View className={cn('gap-1.5', className)}>
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
      <View
        className={cn(
          'flex-row flex-wrap items-center bg-surface dark:bg-surface-dark border rounded-lg px-2 py-1.5 gap-1.5',
          focused
            ? 'border-accent dark:border-accent-dark'
            : 'border-border dark:border-border-dark',
        )}
      >
        {values.map((v) => (
          <View
            key={v}
            className="flex-row items-center bg-accent-soft dark:bg-accent-soft-dark border border-accent/30 dark:border-accent-dark/40 rounded-full pl-2.5 pr-1 py-0.5"
          >
            <Text
              className="text-accent dark:text-accent-dark text-xs"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {v}
            </Text>
            <Pressable
              onPress={() => onChange(values.filter((x) => x !== v))}
              className="ml-1 w-4 h-4 items-center justify-center"
            >
              <Ionicons name="close" size={12} color={colors.accent} />
            </Pressable>
          </View>
        ))}
        <TextInput
          value={text}
          onChangeText={(v) => {
            if (v.endsWith(',')) {
              commit(v);
            } else {
              setText(v);
            }
          }}
          onSubmitEditing={() => commit(text)}
          onBlur={() => {
            setFocused(false);
            if (text.trim()) commit(text);
          }}
          onFocus={() => setFocused(true)}
          placeholder={values.length === 0 ? placeholder : ''}
          placeholderTextColor={colors.fgSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 min-w-[120px] text-fg dark:text-fg-dark-DEFAULT text-[15px] py-1.5"
          style={{ fontFamily: 'Inter_400Regular' }}
        />
      </View>
    </View>
  );
}
