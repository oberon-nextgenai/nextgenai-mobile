/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // jest-expo ships the RN/Expo packages as untranspiled ESM. `standard-navigation`
  // is the React Navigation fork expo-router 57 bundles, and needs the same treatment.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|nativewind|react-native-css-interop|standard-navigation))',
  ],
  collectCoverageFrom: ['lib/**/*.ts', 'components/**/*.tsx', '!**/*.d.ts'],
};
