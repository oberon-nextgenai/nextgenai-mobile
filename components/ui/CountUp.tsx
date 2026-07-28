import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Text, type TextProps } from '@/components/ui/Text';

export interface CountUpProps extends Omit<TextProps, 'children'> {
  /**
   * The number to land on. A value that arrives late — data loading after mount —
   * counts up the first time it is a real number rather than on the initial 0.
   */
  value: number;
  /** How the number is rendered at every step. Defaults to a rounded integer. */
  format?: (n: number) => string;
  /** Tween length. */
  duration?: number;
  /** Stagger, for a grid of numerals that should not all start on the same frame. */
  delay?: number;
}

const roundedInteger = (n: number) => String(Math.round(n));

/**
 * A numeral that counts from zero to `value` once, on first paint.
 *
 * ## Why `useAnimatedReaction` + `runOnJS` and not an `AnimatedTextInput`
 *
 * Reanimated cannot write a number into a `Text` child from a worklet, so the two
 * options are an `AnimatedTextInput` whose `text` prop is driven by
 * `useAnimatedProps` (never touches JS) or a UI-thread tween that pushes values
 * across to React state. This takes the second route, for two reasons:
 *
 *  1. A `TextInput` is not the `Text` primitive. It would have to re-implement the
 *     type role by hand, it announces to screen readers as an editable field, and
 *     it carries platform-specific baseline and padding quirks — a real cost, in a
 *     component whose entire job is to render one styled number.
 *  2. The JS-thread cost here is a rounding error. The *animation* is entirely on
 *     the UI thread: `withTiming` owns the easing and the frame pacing, and
 *     `useAnimatedReaction` fires at most once per frame. The only thing crossing
 *     the bridge is the current number, and `setDisplay` stores the **formatted
 *     string**, so React bails out of re-rendering on every frame where the visible
 *     numeral has not changed. Counting to 14 re-renders 15 times over ~700ms, not
 *     42 — the formatter, not the frame rate, sets the re-render count.
 *
 * There is no `setInterval` and no JS-driven tween anywhere in here.
 */
export function CountUp({
  value,
  format = roundedInteger,
  duration = 700,
  delay = 0,
  ...textProps
}: CountUpProps) {
  const reduceMotion = useReducedMotion();

  const target = Number.isFinite(value) ? value : 0;
  // A 0 is what a screen shows *before* its data lands, so it is not a number
  // worth counting to — wait for a real one. A genuine zero simply renders as
  // zero, which is where the count would have ended anyway.
  const hasRealValue = Number.isFinite(value) && value !== 0;
  const willCount = hasRealValue && !reduceMotion;

  // Seeded so the final number never flashes for a frame before the count starts.
  const progress = useSharedValue(willCount ? 0 : target);
  const [display, setDisplay] = useState(() => format(willCount ? 0 : target));

  // `format` is usually an inline arrow, so it is held in a ref instead of in the
  // effect's dependencies — otherwise every parent render would restart the tween.
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  });

  // The same guard Sparkline uses: counting is a first-paint event. A refetch that
  // returns a new number updates the numeral in place, it does not replay the count.
  const hasCounted = useRef(false);

  const emit = useCallback((n: number) => {
    const next = formatRef.current(n);
    setDisplay(prev => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    if (!hasRealValue || reduceMotion || hasCounted.current) {
      // No real value yet, reduced motion, or the count already ran: land on the
      // number with no animation.
      progress.value = target;
      emit(target);
      return;
    }

    hasCounted.current = true;
    progress.value = 0;
    emit(0);
    progress.value = withDelay(
      delay,
      withTiming(target, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [target, hasRealValue, reduceMotion, delay, duration, progress, emit]);

  useAnimatedReaction(
    () => progress.value,
    current => {
      runOnJS(emit)(current);
    },
    [emit],
  );

  return <Text {...textProps}>{display}</Text>;
}
