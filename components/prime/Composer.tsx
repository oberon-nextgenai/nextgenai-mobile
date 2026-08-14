import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Type } from '@/constants/Typography';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';
import type { PrimeVoicePhase } from '@/api/hooks/usePrimeVoice';
import { PulseRings } from './PulseRings';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  /** Ends the in-flight turn — the send button morphs into stop while streaming. */
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** Hands-free call toggle (shown only when handlers are provided). */
  showCall?: boolean;
  callActive?: boolean;
  callPhase?: PrimeVoicePhase;
  onToggleCall?: () => void;
}

const PHASE_LABEL: Record<PrimeVoicePhase, string> = {
  idle: 'Connecting',
  listening: 'Listening',
  transcribing: 'Transcribing',
  thinking: 'Thinking',
  speaking: 'Speaking',
};

/**
 * While a call is live the composer stops being a text field and becomes the
 * line to Prime: pulse orb, machine-state phase label, end-call control. Chat
 * stays visible above — voice is turn-based and the answers are visual cards.
 */
function CallDock({
  phase,
  onEnd,
  disabled,
}: {
  phase: PrimeVoicePhase;
  onEnd: () => void;
  disabled?: boolean;
}) {
  const { colors } = useThemeMode();
  const press = usePressScale({ disabled });
  // Green = live mic (you're on air); violet = Prime's side of the line.
  const phaseColor = phase === 'listening' ? colors.success : colors.accent2;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      className="flex-row items-center py-1.5 pl-1"
    >
      <PulseRings size={40} color={phaseColor} />
      <View className="flex-1 ml-3">
        {/* Call phase is a machine state, not prose — mono. */}
        <Text variant="mono.labelLg" style={{ color: phaseColor }}>
          {PHASE_LABEL[phase]}
        </Text>
        <Text variant="body.xs" tone="subtle" className="mt-0.5">
          Hands-free · headphones recommended
        </Text>
      </View>
      <AnimatedPressable
        onPress={onEnd}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel="End Prime call"
        hitSlop={8}
        className="flex-row items-center rounded-full h-9 px-4"
        style={[press.animatedStyle, { backgroundColor: colors.danger }]}
      >
        <Ionicons
          name="call"
          size={16}
          color="#FFFFFF"
          style={{ transform: [{ rotate: '135deg' }] }}
        />
        <Text variant="body.medium" tone="onAccent" className="ml-1.5">
          End
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function Composer({
  value,
  onChange,
  onSubmit,
  isStreaming,
  onStop,
  disabled,
  placeholder = 'Ask Prime…',
  showCall,
  callActive,
  callPhase = 'idle',
  onToggleCall,
}: ComposerProps) {
  const inputRef = useRef<TextInput>(null);
  const { colors } = useThemeMode();
  const canSend = Boolean(value.trim()) && !isStreaming && !disabled;
  const canStop = isStreaming && Boolean(onStop);
  const sendPress = usePressScale({ disabled: !canSend && !canStop });
  const callPress = usePressScale({ disabled });

  const handleSend = () => {
    if (canStop) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      onStop?.();
      return;
    }
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onSubmit();
  };

  const handleToggleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onToggleCall?.();
  };

  // One primary control, three faces: send (accent, arrow) → stop (accent,
  // square) → resting (quiet surface). The key swap re-runs the zoom so the
  // morph is felt, not just repainted.
  const sendState = canStop ? 'stop' : canSend ? 'send' : 'rest';
  const sendActive = canStop || canSend;

  return (
    <GlassSurface border="top" radius={0} elevation="none" intensity={36} className="px-3 pt-2 pb-3">
      {callActive ? (
        <CallDock phase={callPhase} onEnd={handleToggleCall} disabled={disabled} />
      ) : (
        <Animated.View
          entering={FadeIn.duration(180)}
          className="flex-row items-end bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl pl-4 pr-1.5 py-1.5"
        >
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.fgSubtle}
            multiline
            textAlignVertical="center"
            className="flex-1 max-h-32 mr-2 self-center"
            // TextInput is not the Text primitive, so the role is spread directly.
            // lineHeight is pinned after the spread to keep the single-line height.
            style={{
              ...Type.body.md,
              color: colors.fg,
              paddingTop: 0,
              paddingBottom: 0,
              minHeight: 36,
              lineHeight: 18,
            }}
            editable={!disabled}
          />
          {showCall && (
            <AnimatedPressable
              onPress={handleToggleCall}
              disabled={disabled}
              onPressIn={callPress.onPressIn}
              onPressOut={callPress.onPressOut}
              accessibilityLabel="Start Prime call"
              accessibilityRole="button"
              hitSlop={6}
              className="w-9 h-9 rounded-full items-center justify-center mr-1.5 bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark"
              style={callPress.animatedStyle}
            >
              <Ionicons name="call-outline" size={17} color={colors.fgMuted} />
            </AnimatedPressable>
          )}
          <AnimatedPressable
            onPress={handleSend}
            disabled={!sendActive}
            onPressIn={sendPress.onPressIn}
            onPressOut={sendPress.onPressOut}
            accessibilityRole="button"
            accessibilityLabel={canStop ? 'Stop Prime' : 'Send message'}
            hitSlop={6}
            className={cn(
              'w-9 h-9 rounded-full items-center justify-center',
              sendActive
                ? 'bg-accent dark:bg-accent-dark'
                : 'bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark',
            )}
            style={sendPress.animatedStyle}
          >
            <Animated.View key={sendState} entering={ZoomIn.duration(160)}>
              <Ionicons
                name={canStop ? 'stop' : 'arrow-up'}
                size={canStop ? 15 : 18}
                color={sendActive ? '#FFFFFF' : colors.fgSubtle}
              />
            </Animated.View>
          </AnimatedPressable>
        </Animated.View>
      )}
    </GlassSurface>
  );
}
