/**
 * Token values mirrored from tailwind.config.js for inline RN style props
 * (charts, RefreshControl tint, StatusBar, ActivityIndicator color, etc.).
 * NativeWind classNames are preferred for layout/text; this file is for
 * the parts of the API surface that cannot read Tailwind classes.
 *
 * Dark mode = stepped near-black charcoal (no bluish slate).
 * Light mode = clean ivory with refined borders / higher-contrast muted text.
 * Glass + elevation scales added for iOS 26 Liquid Glass and platform shadows.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Surfaces
    bg: '#FAFAF8',
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
    // Brand accents
    accent: '#1E3A8A',
    accentSoft: '#EEF2FF',
    accent2: '#7C3AED',
    accent2Soft: '#F3E8FF',
    steel: '#2563EB',
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
    glassBorder: 'rgba(15,16,20,0.08)',
    glassTint: 'rgba(255,255,255,0.55)',
    blurTint: 'light' as const, // expo-blur `tint` family
    // Charts
    chartGrid: '#EDEEF1',
    chartAxis: '#8A93A1',
    chartSeries: ['#1E3A8A', '#2563EB', '#15803D', '#B45309', '#B91C1C', '#7C3AED'],
  },
  dark: {
    // Surfaces — stepped charcoal, NOT bluish slate
    bg: '#0A0B0E',
    surface: '#15171C',
    surface2: '#1C1F26',
    // Borders
    border: '#262A33',
    borderSubtle: '#1E2129',
    // Foreground (text)
    fg: '#F4F5F7',
    fgMuted: '#A2A9B4',
    fgSubtle: '#6B7280',
    fgInverse: '#0A0B0E',
    // Brand accents
    accent: '#6366F1',
    accentSoft: 'rgba(99,102,241,0.16)',
    accent2: '#A78BFA',
    accent2Soft: 'rgba(167,139,250,0.16)',
    steel: '#818CF8',
    // Semantic
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    successSoft: 'rgba(52,211,153,0.16)',
    warningSoft: 'rgba(251,191,36,0.16)',
    dangerSoft: 'rgba(248,113,113,0.16)',
    // Navigation chrome
    tabBarBg: '#15171C',
    tabBarBorder: '#1E2129',
    // Glass (iOS 26 Liquid Glass)
    surfaceGlass: 'rgba(21,23,28,0.62)',
    glassBorder: 'rgba(255,255,255,0.10)',
    glassTint: 'rgba(21,23,28,0.50)',
    blurTint: 'dark' as const,
    // Charts
    chartGrid: '#262A33',
    chartAxis: '#6B7280',
    chartSeries: ['#818CF8', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#A2A9B4'],
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
