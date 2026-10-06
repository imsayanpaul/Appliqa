/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Sharp, editorial corners. Overriding the scale (not extending) keeps every
    // existing rounded-* class in the app consistent with the design system.
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '2px',
      md: '2px',
      lg: '3px',
      xl: '4px',
      '2xl': '4px',
      '3xl': '6px',
      full: '9999px',
    },
    // Flat surfaces separated by hairlines; shadows only hint at elevation.
    boxShadow: {
      none: 'none',
      '2xs': 'none',
      xs: 'none',
      sm: '0 1px 0 rgba(23, 23, 23, 0.04)',
      DEFAULT: '0 1px 2px rgba(23, 23, 23, 0.06)',
      md: '0 1px 2px rgba(23, 23, 23, 0.06)',
      lg: '0 2px 6px rgba(23, 23, 23, 0.06)',
      xl: '0 8px 24px -12px rgba(23, 23, 23, 0.18)',
      '2xl': '0 16px 40px -20px rgba(23, 23, 23, 0.25)',
      inner: 'inset 0 1px 2px rgba(23, 23, 23, 0.06)',
    },
    extend: {
      fontFamily: {
        sans: ['"Mona Sans Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        paper: '#F7F5F2',
        ink: '#171717',
        line: '#D8D4CC',
        accent: {
          DEFAULT: '#CA3C0A',
          hover: '#B73609',
          soft: '#FFF0E8',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  }
}
