/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces — nebula: near-black canvas, stepped cards
        bg: {
          DEFAULT: '#FAFAF8', // ivory page background
          dark: '#08080C', // near-black canvas in dark mode
        },
        'bg-2': {
          DEFAULT: '#F2F1EE', // gradient floor (light)
          dark: '#0B0A12', // canvas2 — gradient floor under radial orbs
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#0F0F16', // card
        },
        'surface-2': {
          DEFAULT: '#F4F4F1', // refined ivory step — now distinct from bg
          dark: '#15151E', // card step / secondary button
        },
        // Prime-authored cards — violet-tinted surface
        'surface-prime': {
          DEFAULT: '#F6F3FF',
          dark: '#13101F',
        },
        // Glass fills (iOS 26 Liquid Glass) — translucent, set behind expo-blur
        'surface-glass': {
          DEFAULT: 'rgba(255,255,255,0.72)',
          dark: 'rgba(15,15,22,0.62)',
        },
        'glass-strong': {
          DEFAULT: 'rgba(255,255,255,0.85)',
          dark: 'rgba(255,255,255,0.12)',
        },

        // Borders — opaque hairlines in dark, per the deck
        border: {
          DEFAULT: '#E2E4E9',
          subtle: '#EDEEF1',
          strong: '#D3D6DD',
          dark: '#1F1F2A',
          'dark-subtle': '#191820',
          'dark-strong': '#2B2B38',
          glass: 'rgba(15,16,20,0.08)',
          'glass-dark': 'rgba(255,255,255,0.10)',
        },

        // Foreground (text)
        fg: {
          DEFAULT: '#0B0C0F', // higher-contrast graphite
          muted: '#525A66', // slate — AA on bg/surface
          subtle: '#8A93A1',
          inverse: '#FAFAF8',
          'dark-DEFAULT': '#FFFFFF',
          'dark-muted': '#B5B5BB',
          'dark-subtle': '#6E6E80',
        },

        // Brand accent — violet primary (AI / Prime / selected)
        accent: {
          DEFAULT: '#5B21B6', // deep violet (operational, primary)
          soft: '#EDE9FE',
          dark: '#9364F3', // primary fills/selected
          'soft-dark': 'rgba(147,100,243,0.18)',
        },
        // Secondary accent — AI affordances + violet text on dark
        'accent-2': {
          DEFAULT: '#7C3AED', // violet
          soft: '#F3E8FF',
          dark: '#A786FF',
          'soft-dark': 'rgba(167,134,255,0.18)',
        },
        // Filter chips — selected state
        'chip-selected': {
          DEFAULT: '#EDE9FE',
          dark: '#181229',
        },
        'chip-selected-border': {
          DEFAULT: '#C4B5FD',
          dark: '#382A5C',
        },
        steel: {
          DEFAULT: '#2563EB',
          dark: '#518AD1',
        },
        // Analytics / telemetry / comms
        plasma: {
          DEFAULT: '#0E7490',
          dark: '#4CC9F0',
        },
        cyan: {
          DEFAULT: '#0891B2',
          dark: '#1C91A5',
        },

        // Semantic
        success: { DEFAULT: '#15803D', dark: '#34C268' },
        'success-bright': { DEFAULT: '#16A34A', dark: '#4ADD80' },
        warning: { DEFAULT: '#B45309', dark: '#FBBF24' },
        danger: { DEFAULT: '#B91C1C', dark: '#F87171' },
        'success-soft': { DEFAULT: '#DCFCE7', dark: 'rgba(52,194,104,0.16)' },
        'warning-soft': { DEFAULT: '#FEF3C7', dark: 'rgba(251,191,36,0.16)' },
        'danger-soft': { DEFAULT: '#FEE2E2', dark: 'rgba(248,113,113,0.16)' },

        // Channel identities (comms mix) — categorical, not semantic
        channel: {
          calls: '#8B5CF6',
          email: '#518AD1',
          sms: '#3CAC67',
          whatsapp: '#1C91A5',
          teams: '#D5A322',
        },
      },
      fontFamily: {
        // See constants/Typography.ts — serif = the answer, sans = the
        // explanation, mono = the provenance.
        sans: ['Inter_400Regular', 'System'],
        medium: ['Inter_500Medium', 'System'],
        semibold: ['Inter_600SemiBold', 'System'],
        bold: ['Inter_700Bold', 'System'],
        serif: ['Newsreader_400Regular', 'Georgia', 'serif'],
        'serif-medium': ['Newsreader_500Medium', 'Georgia', 'serif'],
        'serif-semibold': ['Newsreader_600SemiBold', 'Georgia', 'serif'],
        'serif-italic': ['Newsreader_400Regular_Italic', 'Georgia', 'serif'],
        mono: ['JetBrainsMono_400Regular', 'Menlo', 'monospace'],
        'mono-medium': ['JetBrainsMono_500Medium', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px', // section cards, inputs, chart cards
        '4xl': '28px', // sheets / hero cards / floating chrome
        full: '9999px', // pills, chips, segmented controls
      },
    },
  },
  plugins: [],
};
