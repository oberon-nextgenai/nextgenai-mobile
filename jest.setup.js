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

// Silence the RN animation-frame warning that jest-expo surfaces on unmount.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });
