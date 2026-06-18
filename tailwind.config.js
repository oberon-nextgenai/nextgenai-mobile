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
          dark: '#03040A', // near-black nebula canvas in dark mode
        },
        'bg-2': {
          DEFAULT: '#F2F1EE', // gradient floor (light)
          dark: '#070913', // canvas2 — gradient floor under radial orbs
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#10131C', // nebula card
        },
        'surface-2': {
          DEFAULT: '#F4F4F1', // refined ivory step — now distinct from bg
          dark: '#151A27', // nebula card step
        },
        // Glass fills (iOS 26 Liquid Glass) — translucent, set behind expo-blur
        'surface-glass': {
          DEFAULT: 'rgba(255,255,255,0.72)',
          dark: 'rgba(16,19,28,0.62)',
        },
        'glass-strong': {
          DEFAULT: 'rgba(255,255,255,0.85)',
          dark: 'rgba(255,255,255,0.12)',
        },

        // Borders
        border: {
          DEFAULT: '#E2E4E9',
          subtle: '#EDEEF1',
          dark: 'rgba(255,255,255,0.12)',
          'dark-subtle': 'rgba(255,255,255,0.06)',
          glass: 'rgba(15,16,20,0.08)',
          'glass-dark': 'rgba(255,255,255,0.12)',
        },

        // Foreground (text)
        fg: {
          DEFAULT: '#0B0C0F', // higher-contrast graphite
          muted: '#525A66', // slate — AA on bg/surface
          subtle: '#8A93A1',
          inverse: '#FAFAF8',
          'dark-DEFAULT': '#F7F8FF',
          'dark-muted': '#A4ADC2',
          'dark-subtle': '#697188',
        },

        // Brand accent — violet primary (AI / Prime / selected)
        accent: {
          DEFAULT: '#5B21B6', // deep violet (operational, primary)
          soft: '#EDE9FE',
          dark: '#6E38F7', // deepViolet — primary fills/selected
          'soft-dark': 'rgba(110,56,247,0.18)',
        },
        // Secondary accent — AI affordances + violet text on dark (AA-safe)
        'accent-2': {
          DEFAULT: '#7C3AED', // violet
          soft: '#F3E8FF',
          dark: '#9B6CFF', // auraViolet — AA-safe violet text on nebula
          'soft-dark': 'rgba(155,108,255,0.18)',
        },
        steel: {
          DEFAULT: '#2563EB',
          dark: '#4CC9F0', // plasmaBlue
        },
        // Analytics / telemetry / comms
        plasma: {
          DEFAULT: '#0E7490',
          dark: '#4CC9F0',
        },
        cyan: {
          DEFAULT: '#0891B2',
          dark: '#00D4FF',
        },

        // Semantic — nebula in dark (mint / amber / critical)
        success: { DEFAULT: '#15803D', dark: '#36F5A2' },
        warning: { DEFAULT: '#B45309', dark: '#FFB547' },
        danger: { DEFAULT: '#B91C1C', dark: '#FF4D6D' },
        'success-soft': { DEFAULT: '#DCFCE7', dark: 'rgba(54,245,162,0.16)' },
        'warning-soft': { DEFAULT: '#FEF3C7', dark: 'rgba(255,181,71,0.16)' },
        'danger-soft': { DEFAULT: '#FEE2E2', dark: 'rgba(255,77,109,0.16)' },
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
