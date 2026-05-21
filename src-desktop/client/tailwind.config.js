/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark theme palette
        surface: {
          900: '#0d0f14',   // deepest background
          800: '#13161e',   // main background
          700: '#1a1e2a',   // card/panel background
          600: '#222636',   // elevated surface
          500: '#2a2f42',   // border, divider
          400: '#363c54',   // subtle highlight
        },
        accent: {
          DEFAULT: '#6c8ef7', // primary blue-violet
          hover:   '#8aa4ff',
          dim:     '#3d5299',
        },
        success: '#4ade80',
        warning: '#fbbf24',
        danger:  '#f87171',
        info:    '#38bdf8',
        // Item type colors
        task:     '#6c8ef7',
        idea:     '#a78bfa',
        note:     '#34d399',
        reminder: '#fbbf24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
