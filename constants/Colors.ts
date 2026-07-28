/**
 * Token values mirrored from tailwind.config.js for inline RN style props
 * (charts, RefreshControl tint, StatusBar, ActivityIndicator color, etc.).
 * NativeWind classNames are preferred for layout/text; this file is for
 * the parts of the API surface that cannot read Tailwind classes.
 *
 * Dark mode is the product — near-black canvas with violet accents (CEO command app).
 * Values are sampled from the Prime Mobile 2026 deck, not chosen by eye.
 * Light mode = clean ivory (secondary), accent nudged into the violet family for brand parity.
 * Glass + elevation scales added for iOS 26 Liquid Glass and platform shadows.
 *
 * Color semantics (enforce in review): violet = AI/Prime/selected · green = healthy/done ·
 * amber = warning/SLA · red = breach/reject · plasma/cyan = analytics/telemetry.
 *
 * Primary and approve CTAs are gradients (accentGradient / successGradient), not flat
 * fills — see components/ui/GradientButton.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Surfaces
    bg: '#FAFAF8',
    bg2: '#F2F1EE', // gradient floor / nebula base in light mode
    surface: '#FFFFFF',
    surface2: '#F4F4F1',
    surfacePrime: '#F6F3FF', // Prime-authored cards (violet-tinted)
    // Borders
    border: '#E2E4E9',
    borderSubtle: '#EDEEF1',
    borderStrong: '#D3D6DD',
    /** Top edge of a card — a lighter hairline reads as a lit edge. See ui/Card. */
    borderGloss: '#FFFFFF',
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
    /** Left→right fill for primary buttons (expo-linear-gradient). */
    accentGradient: ['#5B21B6', '#7C3AED'] as const,
    /** Left→right fill for approve/confirm buttons. */
    successGradient: ['#15803D', '#22C55E'] as const,
    steel: '#2563EB',
    plasma: '#0E7490', // analytics/telemetry (cyan-700, AA on light)
    cyan: '#0891B2',
    // Semantic
    success: '#15803D',
    successBright: '#16A34A', // health bars, status dots, "on track"
    warning: '#B45309',
    danger: '#B91C1C',
    successSoft: '#DCFCE7',
    warningSoft: '#FEF3C7',
    dangerSoft: '#FEE2E2',
    // Filter chips — selected state
    chipSelectedBg: '#EDE9FE',
    chipSelectedBorder: '#C4B5FD',
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
    // Surfaces — sampled from the Prime Mobile 2026 deck slides
    bg: '#08080C', // canvas
    bg2: '#0B0A12', // canvas2 — gradient floor under radial orbs
    surface: '#0F0F16', // card
    surface2: '#15151E', // card step / secondary button
    surfacePrime: '#13101F', // Prime-authored cards (violet-tinted)
    // Borders — opaque hairlines, per the deck (not alpha whites)
    border: '#1F1F2A',
    borderSubtle: '#191820',
    borderStrong: '#2B2B38',
    /**
     * Top edge of a card. A hairline lighter than the other three sides reads as
     * a light source above the surface — this is what stops dark cards looking
     * flat, and it costs nothing extra to render. See ui/Card.
     */
    borderGloss: '#31313F',
    // Foreground (text)
    fg: '#FFFFFF',
    fgMuted: '#B5B5BB',
    fgSubtle: '#6E6E80',
    fgInverse: '#08080C',
    // Brand accents — violet primary. Primary CTAs use the accentGradient.
    accent: '#9364F3', // primary fills/selected; white text ~4.6:1
    accentSoft: 'rgba(147,100,243,0.18)',
    accent2: '#A786FF', // violet text affordances on surface
    accent2Soft: 'rgba(167,134,255,0.18)',
    /** Left→right fill for primary buttons (expo-linear-gradient). */
    accentGradient: ['#8347F0', '#A786FF'] as const,
    /** Left→right fill for approve/confirm buttons. */
    successGradient: ['#2ABD60', '#47DE7E'] as const,
    steel: '#518AD1',
    plasma: '#4CC9F0', // analytics/telemetry
    cyan: '#1C91A5',
    // Semantic
    success: '#34C268',
    successBright: '#4ADD80', // health bars, status dots, "on track"
    warning: '#FBBF24',
    danger: '#F87171',
    successSoft: 'rgba(52,194,104,0.16)',
    warningSoft: 'rgba(251,191,36,0.16)',
    dangerSoft: 'rgba(248,113,113,0.16)',
    // Filter chips — selected state
    chipSelectedBg: '#181229',
    chipSelectedBorder: '#382A5C',
    // Navigation chrome
    tabBarBg: '#0F0F16',
    tabBarBorder: '#1F1F2A',
    // Glass (iOS 26 Liquid Glass)
    surfaceGlass: 'rgba(15,15,22,0.62)',
    glassStrong: 'rgba(255,255,255,0.12)',
    glassBorder: 'rgba(255,255,255,0.10)',
    glassTint: 'rgba(15,15,22,0.50)',
    blurTint: 'dark' as const,
    // Charts
    chartGrid: 'rgba(255,255,255,0.08)',
    chartAxis: '#6E6E80',
    chartSeries: ['#A786FF', '#518AD1', '#4ADD80', '#FBBF24', '#1C91A5', '#B5B5BB'],
  },
} as const;

/**
 * Per-channel colours for the comms mix and conversation rows. Held apart from
 * the theme palette because they are categorical identities, not semantic roles —
 * a channel keeps its colour regardless of state.
 */
export const ChannelColors = {
  calls: '#8B5CF6',
  email: '#518AD1',
  sms: '#3CAC67',
  whatsapp: '#1C91A5',
  teams: '#D5A322',
} as const;

export type ChannelKey = keyof typeof ChannelColors;

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
