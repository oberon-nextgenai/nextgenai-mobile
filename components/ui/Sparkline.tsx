import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useThemeMode } from '@/hooks/useThemeMode';
import { buildSparklineGeometry } from '@/lib/sparklineGeometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SparklineProps {
  /** Series to plot, oldest → newest. Fewer than 2 points renders nothing. */
  values: number[];
  /** Stroke colour. Defaults to the theme accent. */
  color?: string;
  /** Fixed height; width is measured from the parent so the line can bleed edge-to-edge. */
  height?: number;
  strokeWidth?: number;
  /** Vertical gradient beneath the line. */
  fill?: boolean;
  /** Draw-in on mount. Ignored when the OS reduce-motion setting is on. */
  animate?: boolean;
  /** Stagger the draw-in when several sparklines mount together. */
  delay?: number;
  style?: ViewStyle;
}

/**
 * A static line chart with an optional gradient fill, drawn once and animated
 * only via `strokeDashoffset`.
 *
 * Deliberately not built on react-native-gifted-charts: these appear four-up in
 * the stat grid and inside every agent row, and a full chart engine per instance
 * costs far more than a single measured path. Nothing here re-renders per frame.
 */
export function Sparkline({
  values,
  color,
  height = 40,
  strokeWidth = 2,
  fill = true,
  animate = true,
  delay = 0,
  style,
}: SparklineProps) {
  const { colors } = useThemeMode();
  const [width, setWidth] = useState(0);
  const stroke = color ?? colors.accent2;
  const reduceMotion = useReducedMotion();
  // useId returns ':r0:'-style strings; strip the colons so it is a valid SVG id.
  const gradientId = `spark${useId().replace(/:/g, '')}`;

  const geometry = useMemo(
    () => buildSparklineGeometry({ values, width, height, strokeWidth }),
    [values, width, height, strokeWidth],
  );

  const shouldAnimate = animate && !reduceMotion;
  const dashLength = geometry?.length ?? 0;
  const progress = useSharedValue(shouldAnimate ? 1 : 0);

  // Draw in once geometry exists. The ref guard means a re-measure (rotation, a
  // layout shift, the parent resizing) does not replay the animation.
  const hasDrawn = useRef(false);
  useEffect(() => {
    if (!geometry || hasDrawn.current) return;
    hasDrawn.current = true;
    progress.value = shouldAnimate
      ? withDelay(delay, withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) }))
      : 0;
  }, [geometry, shouldAnimate, delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashLength * progress.value,
  }));

  return (
    <View
      style={[{ height, width: '100%' }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      pointerEvents="none"
    >
      {geometry ? (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            {/* Gradient ids are document-global; without a per-instance id every
                sparkline on the screen would render the first one's colour. */}
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {fill ? <Path d={geometry.area} fill={`url(#${gradientId})`} /> : null}
          <AnimatedPath
            d={geometry.line}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={dashLength}
            animatedProps={animatedProps}
          />
        </Svg>
      ) : null}
    </View>
  );
}
