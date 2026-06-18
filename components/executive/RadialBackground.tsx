import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useThemeMode } from '@/hooks/useThemeMode';

/**
 * Nebula backdrop for executive surfaces: a vertical canvas→canvas2 floor with
 * two soft radial orbs (violet top-right, plasma/cyan bottom-left). Pure gradient
 * fills — no blur — so it stays crisp and cheap on both iOS and Android.
 *
 * Renders behind content as an absolute layer. In light mode the orbs are dialed
 * way back so the surface stays clean.
 */
export function RadialBackground() {
  const { colors, mode } = useThemeMode();
  const dark = mode === 'dark';

  const violet = colors.accent2;
  const cyan = colors.cyan;

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      // fill the parent regardless of aspect ratio
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <LinearGradient id="nebulaFloor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.bg} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.bg2} stopOpacity={1} />
        </LinearGradient>
        <RadialGradient id="nebulaOrbA" cx="85%" cy="10%" rx="70%" ry="55%">
          <Stop offset="0" stopColor={violet} stopOpacity={dark ? 0.3 : 0.1} />
          <Stop offset="1" stopColor={violet} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="nebulaOrbB" cx="8%" cy="96%" rx="78%" ry="60%">
          <Stop offset="0" stopColor={cyan} stopOpacity={dark ? 0.2 : 0.07} />
          <Stop offset="1" stopColor={cyan} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebulaFloor)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebulaOrbA)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebulaOrbB)" />
    </Svg>
  );
}
