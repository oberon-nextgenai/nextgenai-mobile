import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useThemeMode } from '@/hooks/useThemeMode';

interface PulseRingsProps {
  /** Outer ring diameter in pixels. */
  size?: number;
  /** Ring + center dot color. Defaults to `accent-2` (violet, AI affordance). */
  color?: string;
}

interface RingProps {
  delay: number;
  duration: number;
  color: string;
}

function Ring({ delay, duration, color }: RingProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [delay, duration, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + progress.value * 0.6 }],
    opacity: 0.55 * (1 - progress.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          inset: 0,
          borderRadius: 9999,
          borderWidth: 1.4,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * Center filled dot + 3 concentric rings that pulse outward continuously.
 * Designed to sit beside or behind the Prime "thinking" indicator while
 * streaming, mirroring the Pulse Orb brand mark in motion.
 */
export function PulseRings({ size = 36, color }: PulseRingsProps) {
  const { colors } = useThemeMode();
  const ringColor = color ?? colors.accent2;
  const dotSize = Math.max(6, Math.round(size * 0.18));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Ring delay={0} duration={1600} color={ringColor} />
      <Ring delay={530} duration={1600} color={ringColor} />
      <Ring delay={1060} duration={1600} color={ringColor} />
      <View
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: ringColor,
        }}
      />
    </View>
  );
}
