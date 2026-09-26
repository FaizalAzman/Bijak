// Malaysia has no daylight saving, so day boundaries (streaks, quests) are deterministic.
process.env.TZ = 'Asia/Kuala_Lumpur';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  // Resolve react-native-worklets to its JS implementation (no native runtime in Jest).
  resolver: 'react-native-worklets/jest/resolver',
  setupFiles: ['<rootDir>/tests/setup/mocks.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/afterEnv.ts'],
  // Fake clocks, real microtasks: React's act() relies on queueMicrotask to settle updates.
  fakeTimers: { doNotFake: ['queueMicrotask', 'nextTick'] },
  // Stylesheets (NativeWind's global.css) mean nothing to Jest.
  moduleNameMapper: { '\\.css$': '<rootDir>/tests/setup/styleMock.js' },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|lucide-react-native|zustand))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/theme/tokens.d.ts'],
  coverageReporters: ['text-summary', 'text', 'json-summary'],
  // Business rules must stay (almost) fully covered; screens and components a bit less so.
  coverageThreshold: {
    // "global" = everything not listed below, i.e. screens and components.
    global: { statements: 88, branches: 80, functions: 85, lines: 90 },
    './src/store/': { statements: 99, branches: 97, functions: 100, lines: 100 },
    './src/features/': { statements: 98, branches: 95, functions: 99, lines: 99 },
    './src/lib/': { statements: 92, branches: 84, functions: 90, lines: 96 },
    './src/hooks/': { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
};
