/* eslint-env jest */

// Reanimated ships a jest mock; without it every animated component throws.
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
