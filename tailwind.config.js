/** @type {import('tailwindcss').Config} */
const { colors } = require('./src/theme/tokens');

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      fontFamily: {
        body: ['PlusJakartaSans_500Medium'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
        black: ['PlusJakartaSans_800ExtraBold'],
        display: ['Fredoka_600SemiBold'],
        'display-bold': ['Fredoka_700Bold'],
        mono: ['SpaceMono_400Regular'],
        'mono-bold': ['SpaceMono_700Bold'],
      },
      borderRadius: {
        chunk: '18px',
        blob: '24px',
      },
    },
  },
  plugins: [],
};
