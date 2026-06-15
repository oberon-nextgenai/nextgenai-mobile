/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: {
          DEFAULT: '#FAFAF8', // ivory page background
          dark: '#0A0B0E', // near-black charcoal page background in dark mode
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#15171C', // charcoal surface
        },
        'surface-2': {
          DEFAULT: '#F4F4F1', // refined ivory step — now distinct from bg
          dark: '#1C1F26', // charcoal surface step
        },
        // Glass fills (iOS 26 Liquid Glass) — translucent, set behind expo-blur
        'surface-glass': {
          DEFAULT: 'rgba(255,255,255,0.72)',
          dark: 'rgba(21,23,28,0.62)',
        },

        // Borders
        border: {
          DEFAULT: '#E2E4E9',
          subtle: '#EDEEF1',
          dark: '#262A33',
          'dark-subtle': '#1E2129',
          glass: 'rgba(15,16,20,0.08)',
          'glass-dark': 'rgba(255,255,255,0.10)',
        },

        // Foreground (text)
        fg: {
          DEFAULT: '#0B0C0F', // higher-contrast graphite
          muted: '#525A66', // slate — AA on bg/surface
          subtle: '#8A93A1',
          inverse: '#FAFAF8',
          'dark-DEFAULT': '#F4F5F7',
          'dark-muted': '#A2A9B4',
          'dark-subtle': '#6B7280',
        },

        // Brand accent — operational (indigo)
        accent: {
          DEFAULT: '#1E3A8A', // indigo (operational, primary)
          soft: '#EEF2FF',
          dark: '#6366F1', // indigo — cleaner + AA on charcoal
          'soft-dark': 'rgba(99,102,241,0.16)',
        },
        // Secondary accent — used for AI affordances (Agents tab, streaming rings)
        'accent-2': {
          DEFAULT: '#7C3AED', // violet
          soft: '#F3E8FF',
          dark: '#A78BFA',
          'soft-dark': 'rgba(167,139,250,0.16)',
        },
        steel: '#2563EB',

        // Semantic
        success: '#15803D',
        warning: '#B45309',
        danger: '#B91C1C',
        'success-soft': '#DCFCE7',
        'warning-soft': '#FEF3C7',
        'danger-soft': '#FEE2E2',
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'System'],
        medium: ['Inter_500Medium', 'System'],
        semibold: ['Inter_600SemiBold', 'System'],
        bold: ['Inter_700Bold', 'System'],
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
