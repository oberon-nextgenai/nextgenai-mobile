import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/constants';

// expo-secure-store relies on a native keychain/keystore module that doesn't
// exist on web. Fall back to AsyncStorage there (localStorage under the hood).
// On iOS/Android, keep the secure-enclave-backed SecureStore.
const useSecure = Platform.OS !== 'web';

export async function getStoredToken(): Promise<string | null> {
  try {
    if (useSecure) return await SecureStore.getItemAsync(STORAGE_KEYS.jwt);
    return await AsyncStorage.getItem(STORAGE_KEYS.jwt);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  if (useSecure) {
    await SecureStore.setItemAsync(STORAGE_KEYS.jwt, token);
  } else {
    await AsyncStorage.setItem(STORAGE_KEYS.jwt, token);
  }
}

export async function clearStoredToken(): Promise<void> {
  if (useSecure) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.jwt).catch(() => undefined);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.jwt).catch(() => undefined);
  }
}

// The user object carries PII (email, name, phone), so it lives in SecureStore
// on native alongside the JWT — not in plaintext AsyncStorage. PublicUser is a
// small, bounded set of string fields, well under SecureStore's ~2KB limit.
export async function getStoredUser(): Promise<string | null> {
  try {
    if (useSecure) return await SecureStore.getItemAsync(STORAGE_KEYS.user);
    return await AsyncStorage.getItem(STORAGE_KEYS.user);
  } catch {
    return null;
  }
}

export async function setStoredUser(json: string): Promise<void> {
  if (useSecure) {
    await SecureStore.setItemAsync(STORAGE_KEYS.user, json);
  } else {
    await AsyncStorage.setItem(STORAGE_KEYS.user, json);
  }
}

export async function clearStoredUser(): Promise<void> {
  if (useSecure) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.user).catch(() => undefined);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.user).catch(() => undefined);
  }
}
