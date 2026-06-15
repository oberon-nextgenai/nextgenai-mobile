import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import { Elevation } from '@/constants/Colors';

type ElevationLevel = 'sm' | 'md' | 'lg' | 'none';
type Edge = 'top' | 'bottom' | 'all' | 'none';

interface GlassSurfaceProps extends ViewProps {
  children: ReactNode;
  /** Corner radius in px. Default 28 (sheets/chrome). Use 24 for cards. */
  radius?: number;
  /** Blur strength (iOS). Lower = subtler. Default 30. */
  intensity?: number;
  /** Which edge(s) get the hairline border. Default 'all'. */
  border?: Edge;
  /** Soft layered shadow preset. Default 'md'. */
  elevation?: ElevationLevel;
  /** Tailwind classes applied to the inner content wrapper. */
  className?: string;
  /** Force the solid (no-blur) fallback — e.g. for perf-critical surfaces. */
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * iOS 26 "Liquid Glass" surface. Wraps expo-blur's BlurView with the glass
 * tokens, a hairline border and a soft layered shadow. On Android (where blur
 * is weak/janky) it falls back to a solid translucent surface with the same
 * shape. Use for CHROME only — tab bar, header, sticky bars, modal headers —
 * never inside list rows (blur tanks scroll FPS).
 */
export function GlassSurface({
  children,
  radius = 28,
  intensity = 30,
  border = 'all',
  elevation = 'md',
  className,
  solid,
  style,
  ...rest
}: GlassSurfaceProps) {
  const { mode, colors } = useThemeMode();

  const tint = mode === 'dark' ? 'systemThickMaterialDark' : 'systemThickMaterialLight';
  const hairline = colors.glassBorder;

  const borderStyle: ViewStyle | null =
    border === 'none'
      ? null
      : {
          borderColor: hairline,
          borderTopWidth: border === 'all' || border === 'top' ? StyleSheet.hairlineWidth : 0,
          borderBottomWidth:
            border === 'all' || border === 'bottom' ? StyleSheet.hairlineWidth : 0,
          borderLeftWidth: border === 'all' ? StyleSheet.hairlineWidth : 0,
          borderRightWidth: border === 'all' ? StyleSheet.hairlineWidth : 0,
        };

  // Shadow must live on an OUTER non-clipping View; overflow:hidden on the inner
  // BlurView would clip the shadow away.
  const outerShadow = elevation === 'none' ? null : Elevation[elevation];
  const clip: ViewStyle = { borderRadius: radius, overflow: 'hidden' };

  // Android: BlurView blur is weak/expensive → solid translucent surface instead.
  const useBlur = !solid && Platform.OS === 'ios';

  if (useBlur) {
    return (
      <View style={[outerShadow, { borderRadius: radius }, style]}>
        <BlurView intensity={intensity} tint={tint} style={[clip, borderStyle]}>
          {/* Brand wash over the blur for the tinted-glass feel. */}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassTint }]}
          />
          <View {...rest} className={cn(className)}>
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[outerShadow, { borderRadius: radius }, style]}>
      <View
        {...rest}
        style={[clip, borderStyle, { backgroundColor: colors.surfaceGlass }]}
        className={cn(className)}
      >
        {children}
      </View>
    </View>
  );
}
