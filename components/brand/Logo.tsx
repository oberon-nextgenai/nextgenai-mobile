import Svg, { G, Path, Rect, type SvgProps } from 'react-native-svg';
import { useThemeMode } from '@/hooks/useThemeMode';

interface LogoProps extends SvgProps {
  /** Width in px. Height is derived from the 64:38 mark aspect ratio. */
  size?: number;
  /** Override the mark fill. Defaults to the theme foreground. */
  color?: string;
  /**
   * Render the mark on a rounded "glass" tile (used by splash / biometric /
   * any surface where a framed app-icon look is wanted).
   */
  withBackground?: boolean;
  /** Override the tile background when `withBackground`. */
  backgroundColor?: string;
}

// Nextgen N-mark — three flat shapes, viewBox 0 0 64 38.
const ICON_PATHS = [
  'M0 16H13.4V38H0Z',
  'M14 0C28.6 5.7 42.7 20.1 50 38H34.1C29.8 30.1 21.8 21.0 14 15.5Z',
  'M50 0H64V38H50Z',
] as const;

const MARK_RATIO = 64 / 38;

/**
 * Nextgen AI brand mark (icon only). Theme-aware flat fill — dark mark on light
 * surfaces, white on dark. Optionally framed on a rounded tile for splash /
 * biometric gate. The mark is NOT square: height ≈ size * 0.594.
 */
export function Logo({
  size = 28,
  color,
  withBackground = false,
  backgroundColor,
  ...props
}: LogoProps) {
  const { colors, mode } = useThemeMode();
  const fill = color ?? colors.fg;

  if (withBackground) {
    const tile = backgroundColor ?? colors.surface2;
    const border = mode === 'light' ? colors.border : 'transparent';
    return (
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none" {...props}>
        <Rect
          x={0.5}
          y={0.5}
          width={95}
          height={95}
          rx={22}
          fill={tile}
          stroke={border}
          strokeWidth={mode === 'light' ? 1 : 0}
        />
        {/* mark is 64x38; translate(16,29) centers it in the 96 tile */}
        <G transform="translate(16 29)">
          {ICON_PATHS.map((d, i) => (
            <Path key={i} d={d} fill={fill} />
          ))}
        </G>
      </Svg>
    );
  }

  const height = Math.round(size / MARK_RATIO);
  return (
    <Svg width={size} height={height} viewBox="0 0 64 38" fill="none" {...props}>
      {ICON_PATHS.map((d, i) => (
        <Path key={i} d={d} fill={fill} />
      ))}
    </Svg>
  );
}
