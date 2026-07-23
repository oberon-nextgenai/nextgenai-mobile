import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
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
            <Text
              className="text-[11px] text-fg-muted dark:text-fg-dark-muted"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              {phaseLabel}
            </Text>
          </View>
          <Text
            className="text-[11px] text-fg-subtle dark:text-fg-dark-subtle"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
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
          className="flex-1 text-fg dark:text-fg-dark-DEFAULT text-[15px] max-h-32 mr-2"
          style={{
            fontFamily: 'Inter_400Regular',
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
