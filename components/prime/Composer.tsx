import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';
import { Type } from '@/constants/Typography';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { PrimeVoicePhase } from '@/api/hooks/usePrimeVoice';

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  onPlusPress?: () => void;
  /** Hands-free call toggle (shown only when handlers are provided). */
  showCall?: boolean;
  callActive?: boolean;
  callPhase?: PrimeVoicePhase;
  onToggleCall?: () => void;
}

const PHASE_LABEL: Record<Exclude<PrimeVoicePhase, 'idle'>, string> = {
  listening: 'Listening',
  transcribing: 'Transcribing',
  thinking: 'Thinking',
  speaking: 'Speaking',
};

export function Composer({
  value,
  onChange,
  onSubmit,
  isStreaming,
  disabled,
  placeholder = 'Ask Prime anything…',
  onPlusPress,
  showCall,
  callActive,
  callPhase = 'idle',
  onToggleCall,
}: ComposerProps) {
  const inputRef = useRef<TextInput>(null);
  const { colors } = useThemeMode();
  const canSend = Boolean(value.trim()) && !isStreaming && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onSubmit();
  };

  const handleToggleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onToggleCall?.();
  };

  const phaseLabel =
    callActive && callPhase !== 'idle' ? PHASE_LABEL[callPhase] : null;

  return (
    <View className="border-t border-border-subtle dark:border-border-dark-subtle bg-bg dark:bg-bg-dark px-3 py-2 pb-3">
      {phaseLabel ? (
        <View className="mb-1.5 flex-row items-center justify-center gap-2">
          <View
            className={cn(
              'px-2.5 py-0.5 rounded-full',
              callPhase === 'listening'
                ? 'bg-emerald-500/15'
                : callPhase === 'speaking'
                  ? 'bg-accent/15 dark:bg-accent-dark/15'
                  : 'bg-surface-2 dark:bg-surface-2-dark',
            )}
          >
            {/* Call phase is a machine state, not prose — mono, sentence case. */}
            <Text variant="mono.sm" tone="muted">
              {phaseLabel}
            </Text>
          </View>
          <Text variant="body.xs" tone="subtle">
            Headphones recommended
          </Text>
        </View>
      ) : null}
      <View className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl pl-2 pr-2 py-1.5">
        <Pressable
          onPress={onPlusPress}
          disabled={!onPlusPress}
          className="w-8 h-8 rounded-full items-center justify-center mr-1"
        >
          <Ionicons name="add" size={20} color={colors.fgMuted} />
        </Pressable>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.fgSubtle}
          multiline
          textAlignVertical="center"
          className="flex-1 max-h-32 mr-2"
          // TextInput is not the Text primitive, so the role is spread directly.
          // lineHeight is pinned after the spread to keep the single-line height.
          style={{
            ...Type.body.lg,
            color: colors.fg,
            paddingTop: 0,
            paddingBottom: 0,
            minHeight: 36,
            lineHeight: 20,
          }}
          editable={!disabled}
        />
        {showCall && (
          <Pressable
            onPress={handleToggleCall}
            disabled={disabled}
            accessibilityLabel={callActive ? 'End Prime call' : 'Start Prime call'}
            accessibilityRole="button"
            className={cn(
              'w-9 h-9 rounded-full items-center justify-center mr-1.5',
              callActive
                ? 'bg-red-500'
                : 'bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark',
            )}
          >
            <Ionicons
              name={callActive ? 'call' : 'call-outline'}
              size={18}
              color={callActive ? '#FFFFFF' : colors.fgMuted}
            />
          </Pressable>
        )}
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className={cn(
            'w-9 h-9 rounded-full items-center justify-center',
            canSend
              ? 'bg-accent dark:bg-accent-dark'
              : 'bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark',
          )}
        >
          <Ionicons
            name={isStreaming ? 'ellipsis-horizontal' : 'arrow-up'}
            size={18}
            color={canSend ? '#FFFFFF' : colors.fgSubtle}
          />
        </Pressable>
      </View>
    </View>
  );
}
