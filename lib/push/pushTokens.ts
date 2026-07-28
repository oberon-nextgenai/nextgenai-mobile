import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { DevicePlatform, NotificationClass } from '@/api/services/devices';

/**
 * Acquiring an Expo push token, and the Android channels that give each
 * notification class its own importance.
 *
 * Kept apart from the React layer so the permission/token dance — which is
 * platform-conditional and easy to get subtly wrong — is testable and stated in
 * one place.
 */

/**
 * Android needs a channel per importance level; iOS derives it from the payload.
 * Channel ids must match what the backend sends as `channelId`
 * (`devices.service.ts` → `ANDROID_CHANNEL`), or Android silently drops back to
 * the default channel and every alert looks the same.
 */
const ANDROID_CHANNELS: {
  id: string;
  name: string;
  importance: Notifications.AndroidImportance;
  description: string;
}[] = [
  {
    id: 'critical',
    name: 'Critical escalations',
    importance: Notifications.AndroidImportance.MAX,
    description: 'Decisions that need you now.',
  },
  {
    id: 'alerts',
    name: 'Cost, SLA and workflow alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Spend anomalies, SLA risk and failed runs.',
  },
  {
    id: 'brief',
    name: 'Daily brief',
    importance: Notifications.AndroidImportance.LOW,
    description: 'Your morning read on the AI workforce.',
  },
];

export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Promise.all(
    ANDROID_CHANNELS.map(channel =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: channel.importance,
        description: channel.description,
      }),
    ),
  );
}

export type PushTokenFailure =
  | 'simulator'
  | 'permission_denied'
  | 'no_project_id'
  | 'unavailable';

export type PushTokenResult =
  | { ok: true; token: string; platform: DevicePlatform }
  | { ok: false; reason: PushTokenFailure };

/**
 * Request permission and return this device's Expo push token.
 *
 * Never throws — a device that cannot receive notifications is a normal state,
 * not an error. Callers get a typed reason so the UI can say something specific
 * ("Notifications are off in Settings") instead of failing silently.
 */
export async function getExpoPushToken(): Promise<PushTokenResult> {
  // Simulators and emulators cannot receive push. Checking first avoids an
  // unnecessary permission prompt during development.
  if (!Device.isDevice) return { ok: false, reason: 'simulator' };

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    // Only prompt when we have not been refused before — re-asking after a
    // denial does nothing on iOS and just burns the one prompt we get.
    if (!granted && existing.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }

    if (!granted) return { ok: false, reason: 'permission_denied' };

    await ensureAndroidChannels();

    // EAS requires the project id explicitly in bare/dev-client builds; without
    // it `getExpoPushTokenAsync` throws rather than returning a token.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

    if (!projectId) return { ok: false, reason: 'no_project_id' };

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });

    return {
      ok: true,
      token: data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** A human-readable device label for the security screen. */
export function deviceLabel(): string | undefined {
  return Device.deviceName ?? Device.modelName ?? undefined;
}

/** Deep links the backend sends as `data.deepLink`, mapped to in-app routes. */
export function routeForNotification(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const { deepLink } = data as { deepLink?: unknown };
  if (typeof deepLink !== 'string') return null;

  // The backend emits `primeai://approvals/<id>`; strip the scheme to get a
  // router path. Anything not on our scheme is ignored rather than followed.
  const prefix = 'primeai://';
  if (!deepLink.startsWith(prefix)) return null;

  const path = deepLink.slice(prefix.length);
  return path ? `/${path}` : null;
}

/** Type re-export so callers do not need to reach into the service layer. */
export type { NotificationClass };
