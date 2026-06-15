import { useCallback } from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/** Bubbly Liquid Glass spring — fast, slightly bouncy, no overshoot wobble. */
export const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.5 } as const;

interface Options {
  /** Pressed scale. Default 0.96. Large surfaces should use ~0.98. */
  to?: number;
  /** Composed with the hook's handler. Accepts null to match PressableProps. */
  onPressIn?: ((e: GestureResponderEvent) => void) | null;
  onPressOut?: ((e: GestureResponderEvent) => void) | null;
  disabled?: boolean;
}

/**
 * Standardized springy press-scale for any Pressable. Returns an animated style
 * plus onPressIn/onPressOut handlers that compose with caller-supplied ones.
 *
 *   const press = usePressScale({ onPressIn, onPressOut, disabled });
 *   <AnimatedPressable {...press} style={[press.animatedStyle, ...]} />
 */
export function usePressScale({ to = 0.96, onPressIn, onPressOut, disabled }: Options = {}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) scale.value = withSpring(to, PRESS_SPRING);
      onPressIn?.(e);
    },
    [disabled, to, onPressIn, scale],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withSpring(1, PRESS_SPRING);
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );

  return { animatedStyle, onPressIn: handlePressIn, onPressOut: handlePressOut };
}
