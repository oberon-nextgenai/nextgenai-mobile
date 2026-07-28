/**
 * Type roles for the Prime command app.
 *
 * Three families, three jobs — this split is the app's visual signature and the
 * rule to enforce in review:
 *
 *   Newsreader (serif)   = THE ANSWER      — screen titles, hero numerals, verdicts
 *   Inter (sans)         = THE EXPLANATION — body copy, descriptions, button labels
 *   JetBrains Mono       = THE PROVENANCE  — labels, eyebrows, IDs, timestamps, audit fields
 *
 * Spread a role directly into a style prop:
 *   <Text style={[Type.display.lg, { color: colors.fg }]}>Good morning, Sara.</Text>
 *   <Text style={[Type.mono.label, { color: colors.fgSubtle }]}>Fleet health</Text>
 *
 * Only colour is left to the caller — never override fontFamily at a call site.
 * `letterSpacing` is in px (React Native has no em unit); the mono label tracking
 * of 1.2px at 10px is the deck's ~0.12em.
 */

import type { TextStyle } from 'react-native';

export const FontFamily = {
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifSemibold: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',

  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',

  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

/**
 * Serif display. Used for the thing the CEO actually reads: the greeting, the
 * count that matters, the verdict. Never for UI chrome.
 */
const display = {
  /** Hero numerals — agent score "71", lock-screen clock. */
  xl: {
    fontFamily: FontFamily.serif,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  /** Screen titles — "Good morning, Sara.", "Approve human takeover…". */
  lg: {
    fontFamily: FontFamily.serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  /** Section heads and stat-tile values — "14 active agents", "$284". */
  md: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  /** Card titles — "Takeover approved", board-update headline. */
  sm: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  /** Emphasis inside serif runs — the deck's "command app" italic. */
  italic: {
    fontFamily: FontFamily.serifItalic,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
} satisfies Record<string, TextStyle>;

/** Inter. Descriptions, paragraph copy, button labels — everything explanatory. */
const body = {
  lg: { fontFamily: FontFamily.sans, fontSize: 16, lineHeight: 24 },
  md: { fontFamily: FontFamily.sans, fontSize: 14, lineHeight: 21 },
  sm: { fontFamily: FontFamily.sans, fontSize: 13, lineHeight: 19 },
  xs: { fontFamily: FontFamily.sans, fontSize: 12, lineHeight: 17 },
  /** Button labels and anything that needs to hold its own next to a serif value. */
  medium: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 21 },
  semibold: { fontFamily: FontFamily.sansSemibold, fontSize: 14, lineHeight: 21 },
  /**
   * 12px medium — form field labels and dense row titles that need a little more
   * weight than `xs` without stepping up a size. Distinct from `mono.label`,
   * which is for machine metadata rather than a control's name.
   */
  xsMedium: { fontFamily: FontFamily.sansMedium, fontSize: 12, lineHeight: 17 },
  /** Emphasised inline numbers in prose — "2,541 interactions", "87%". */
  strong: { fontFamily: FontFamily.sansSemibold, fontSize: 14, lineHeight: 21 },
} satisfies Record<string, TextStyle>;

/**
 * JetBrains Mono. Every label, eyebrow, identifier and timestamp in the deck is
 * mono — it is what makes the data feel like a record rather than a caption.
 */
const mono = {
  /** The uppercase tracked eyebrow: FLEET HEALTH, CURRENT RUN, AUDIT RECORD. */
  label: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  /** Slightly larger eyebrow for screen-level section heads. */
  labelLg: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  /** Identifiers and timestamps kept in sentence case: ESC-2451, RUN-A4F2. */
  value: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  /** Dense metadata rows — audit fields, tool-panel step text. */
  sm: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  /** Raw JSON / payload inspection. Replaces the hardcoded 'Menlo'. */
  code: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    lineHeight: 18,
  },
} satisfies Record<string, TextStyle>;

export const Type = { display, body, mono } as const;

export type TypeRole = typeof Type;
