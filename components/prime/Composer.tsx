import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  onPlusPress?: () => void;
  /** Voice push-to-talk (mic shown only when these are provided). */
  showMic?: boolean;
  isRecording?: boolean;
  isTranscribing?: boolean;
  onMicPressIn?: () => void;
  onMicPressOut?: () => void;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  isStreaming,
  disabled,
  placeholder = 'Ask Prime anything…',
  onPlusPress,
  showMic,
  isRecording,
  isTranscribing,
  onMicPressIn,
  onMicPressOut,
}: ComposerProps) {
  const inputRef = useRef<TextInput>(null);
  const { colors } = useThemeMode();
  const canSend = Boolean(value.trim()) && !isStreaming && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onSubmit();
  };

  const handleMicPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onMicPressIn?.();
  };

  return (
    <View className="border-t border-border-subtle dark:border-border-dark-subtle bg-bg dark:bg-bg-dark px-3 py-2 pb-3">
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
        {showMic && (
          <Pressable
            onPressIn={handleMicPressIn}
            onPressOut={onMicPressOut}
            disabled={disabled || isStreaming || isTranscribing}
            accessibilityLabel="Hold to talk to Prime"
            accessibilityRole="button"
            className={cn(
              'w-9 h-9 rounded-full items-center justify-center mr-1.5',
              isRecording
                ? 'bg-red-500'
                : 'bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark',
            )}
          >
            <Ionicons
              name={isTranscribing ? 'hourglass-outline' : 'mic'}
              size={18}
              color={isRecording ? '#FFFFFF' : colors.fgMuted}
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
