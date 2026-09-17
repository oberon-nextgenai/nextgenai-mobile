import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/**
 * Lazy access to `expo-notifications`.
 *
 * Importing that module runs `DevicePushTokenAutoRegistration` at module scope,
 * which calls `addPushTokenListener` → `warnOfExpoGoPushUsage`. On Android
 * inside Expo Go that *throws* outright — remote push was removed from Expo Go
 * in SDK 53 — so a static `import` takes the app down during module
 * initialisation, before the first screen renders. The chain that triggers it is
 * `app/(root)/_layout.tsx` → `authHooks` → `pushHooks`, none of which are about
 * push: the whole authenticated shell is unreachable in Expo Go on Android.
 *
 * Requiring the module lazily keeps Expo Go usable for everything except push,
 * and leaves development and production builds completely unaffected. There is
 * no other way out: the throw is unconditional, with no flag or config to opt
 * out of it, because Expo wants you on a development build.
 */
export const pushSupported = !(isRunningInExpoGo() && Platform.OS === 'android');

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/**
 * The `expo-notifications` module, or `null` where importing it would crash.
 * Callers must treat `null` as "this device cannot receive push", which the
 * push layer already models as a normal, typed outcome.
 */
export function getNotifications(): NotificationsModule | null {
  if (cached === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = pushSupported ? (require('expo-notifications') as NotificationsModule) : null;
  }
  return cached;
}
