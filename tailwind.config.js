/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6EFE3',
        'paper-dark': '#EADFCB',
        ink: '#1E1B2E',
        saffron: '#FF7A1A',
        peacock: '#0F8B8D',
        rani: '#E8336D',
        haldi: '#F4C430',
        night: '#14213D',
        chili: '#D7263D',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        hand: ['Caveat', 'cursive'],
      },
      fontSize: {
        micro: ['0.75rem', { lineHeight: '1rem' }],
        small: ['0.875rem', { lineHeight: '1.25rem' }],
        h3: ['1.25rem', { lineHeight: '1.65rem' }],
        h2: ['1.5rem', { lineHeight: '1.9rem' }],
        h1: ['2rem', { lineHeight: '2.35rem' }],
        display: ['2.5rem', { lineHeight: '2.75rem' }],
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
        input: '12px',
      },
      borderWidth: {
        2: '2px',
        3: '3px',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom, 0px)',
      },
      boxShadow: {
        riso: '5px 5px 0 #E8336D',
        'riso-peacock': '5px 5px 0 #0F8B8D',
        'riso-ink': '5px 5px 0 #1E1B2E',
        'riso-haldi': '5px 5px 0 #F4C430',
        'riso-saffron': '5px 5px 0 #FF7A1A',
        'riso-sm': '3px 3px 0 #1E1B2E',
        'riso-press': '2px 2px 0 #1E1B2E',
      },
      keyframes: {
        'pin-drop': {
          '0%': { transform: 'translateY(-24px) scale(0.6)', opacity: '0' },
          '60%': { transform: 'translateY(0) scale(1.1)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'stamp-shake': {
          '0%,100%': { transform: 'rotate(-8deg)' },
          '35%': { transform: 'rotate(-11deg)' },
          '70%': { transform: 'rotate(-5deg)' },
        },
        'train-chug': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      animation: {
        'pin-drop': 'pin-drop 420ms cubic-bezier(.25,.9,.3,1.3) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'stamp-shake': 'stamp-shake 420ms ease-out 1',
        'train-chug': 'train-chug 900ms ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
