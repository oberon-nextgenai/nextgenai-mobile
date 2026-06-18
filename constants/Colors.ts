/**
 * Token values mirrored from tailwind.config.js for inline RN style props
 * (charts, RefreshControl tint, StatusBar, ActivityIndicator color, etc.).
 * NativeWind classNames are preferred for layout/text; this file is for
 * the parts of the API surface that cannot read Tailwind classes.
 *
 * Dark mode = "nebula" — near-black canvas with violet/plasma accents (CEO command app).
 * Light mode = clean ivory (secondary), accent nudged into the violet family for brand parity.
 * Glass + elevation scales added for iOS 26 Liquid Glass and platform shadows.
 *
 * Color semantics (enforce in review): violet = AI/Prime/selected · mint = healthy/done ·
 * amber = warning/SLA · critical-red = breach/reject · plasma/cyan = analytics/telemetry.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Surfaces
    bg: '#FAFAF8',
    bg2: '#F2F1EE', // gradient floor / nebula base in light mode
    surface: '#FFFFFF',
    surface2: '#F4F4F1',
    // Borders
    border: '#E2E4E9',
    borderSubtle: '#EDEEF1',
    // Foreground (text)
    fg: '#0B0C0F',
    fgMuted: '#525A66',
    fgSubtle: '#8A93A1',
    fgInverse: '#FAFAF8',
    // Brand accents — nudged to the violet family for cross-mode brand parity
    accent: '#5B21B6', // deep violet (primary; white text passes AA)
    accentSoft: '#EDE9FE',
    accent2: '#7C3AED', // violet (AI affordances)
    accent2Soft: '#F3E8FF',
    steel: '#2563EB',
    plasma: '#0E7490', // analytics/telemetry (cyan-700, AA on light)
    cyan: '#0891B2',
    // Semantic
    success: '#15803D',
    warning: '#B45309',
    danger: '#B91C1C',
    successSoft: '#DCFCE7',
    warningSoft: '#FEF3C7',
    dangerSoft: '#FEE2E2',
    // Navigation chrome
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#EDEEF1',
    // Glass (iOS 26 Liquid Glass)
    surfaceGlass: 'rgba(255,255,255,0.72)',
    glassStrong: 'rgba(255,255,255,0.85)',
    glassBorder: 'rgba(15,16,20,0.08)',
    glassTint: 'rgba(255,255,255,0.55)',
    blurTint: 'light' as const, // expo-blur `tint` family
    // Charts
    chartGrid: '#EDEEF1',
    chartAxis: '#8A93A1',
    chartSeries: ['#5B21B6', '#0891B2', '#15803D', '#B45309', '#B91C1C', '#7C3AED'],
  },
  dark: {
    // Surfaces — nebula: near-black canvas, stepped cards
    bg: '#03040A', // canvas
    bg2: '#070913', // canvas2 — gradient floor under radial orbs
    surface: '#10131C', // card
    surface2: '#151A27', // card step
    // Borders — hairline whites over the dark canvas
    border: 'rgba(255,255,255,0.12)',
    borderSubtle: 'rgba(255,255,255,0.06)',
    // Foreground (text)
    fg: '#F7F8FF',
    fgMuted: '#A4ADC2',
    fgSubtle: '#697188',
    fgInverse: '#03040A',
    // Brand accents — violet primary, plasma/cyan for telemetry
    accent: '#6E38F7', // deepViolet (primary fills/selected; white text ~5.9:1)
    accentSoft: 'rgba(110,56,247,0.18)',
    accent2: '#9B6CFF', // auraViolet (AI text affordances; ~5.4:1 on surface)
    accent2Soft: 'rgba(155,108,255,0.18)',
    steel: '#4CC9F0', // plasmaBlue
    plasma: '#4CC9F0', // analytics/telemetry
    cyan: '#00D4FF',
    // Semantic — nebula
    success: '#36F5A2', // mint
    warning: '#FFB547', // amber
    danger: '#FF4D6D', // critical
    successSoft: 'rgba(54,245,162,0.16)',
    warningSoft: 'rgba(255,181,71,0.16)',
    dangerSoft: 'rgba(255,77,109,0.16)',
    // Navigation chrome
    tabBarBg: '#10131C',
    tabBarBorder: 'rgba(255,255,255,0.08)',
    // Glass (iOS 26 Liquid Glass)
    surfaceGlass: 'rgba(16,19,28,0.62)',
    glassStrong: 'rgba(255,255,255,0.12)',
    glassBorder: 'rgba(255,255,255,0.12)',
    glassTint: 'rgba(16,19,28,0.50)',
    blurTint: 'dark' as const,
    // Charts — nebula series
    chartGrid: 'rgba(255,255,255,0.08)',
    chartAxis: '#697188',
    chartSeries: ['#9B6CFF', '#4CC9F0', '#36F5A2', '#FFB547', '#00D4FF', '#A4ADC2'],
  },
} as const;

/**
 * Platform-aware elevation scale. iOS uses shadow* props; Android uses elevation.
 * Spread directly into an RN style object: `style={Elevation.md}`.
 * Shadow color stays neutral-black in both modes; on charcoal dark surfaces a
 * soft black shadow plus the stepped surface tokens carry the depth.
 */
export const Elevation = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 12 },
    default: {},
  }),
} as const;

export type ThemeMode = 'light' | 'dark';
export type ColorPalette = (typeof Colors)[ThemeMode];
