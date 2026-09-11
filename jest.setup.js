/* eslint-env jest */

// Reanimated 4 delegates to react-native-worklets, whose native half cannot
// initialise under Jest and throws on import. Mock worklets with the stub it
// ships; real Reanimated then loads fine on top of it.
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);
require('react-native-reanimated').setUpTests?.();

/**
 * Native modules that have no implementation under Jest. Each of these is
 * reached transitively by the stores that almost every component imports
 * (theme → AsyncStorage, auth → SecureStore), so they are mocked globally
 * rather than per-suite.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

// NOTE: the old NativeAnimatedHelper mock is gone. That internal path no longer
// exists in React Native 0.86, and @react-native/jest-preset's moduleNameMapper
// resolves it to a concrete file before `virtual: true` can apply, so the mock
// became a hard resolve error rather than a no-op.
