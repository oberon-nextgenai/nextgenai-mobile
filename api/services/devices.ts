import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';

/**
 * Device registry for push notifications.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/devices`. Delivery is server-side —
 * the Expo Push API for native, VAPID Web Push for `platform: 'web'` — so the
 * only thing the client owns is its token (or subscription) and its preferences.
 */

/** The five classes the backend fans out. Each is separately mutable by the user. */
export const NOTIFICATION_CLASSES = ['critical', 'cost', 'sla_risk', 'workflow', 'brief'] as const;
export type NotificationClass = (typeof NOTIFICATION_CLASSES)[number];

export type DevicePlatform = 'ios' | 'android' | 'web';

/** A browser PushSubscription as serialized by `subscription.toJSON()`. */
export interface WebPushSubscriptionJson {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface Device {
  _id: string;
  organizationId: string;
  userId: string;
  pushToken: string;
  platform: DevicePlatform;
  appVersion?: string;
  deviceName?: string;
  enabled: boolean;
  enabledClasses: NotificationClass[];
  /** Minutes from local midnight; a window where start > end wraps past midnight. */
  quietHoursStartMinute?: number;
  quietHoursEndMinute?: number;
  timeZone?: string;
  lastSeenAt?: string;
  lastNotifiedAt?: string;
}

export interface RegisterDeviceBody {
  organizationId: string;
  /** Expo token — required for native platforms, absent for web. */
  pushToken?: string;
  platform: DevicePlatform;
  /**
   * Required for `platform: 'web'`. The backend keys the device row by the
   * subscription's endpoint, so the endpoint doubles as this device's pushToken
   * for preferences and unregister.
   */
  webPushSubscription?: WebPushSubscriptionJson;
  appVersion?: string;
  deviceName?: string;
  /** IANA zone, used to interpret the quiet-hours window. */
  timeZone?: string;
}

/**
 * Register or refresh this device. Idempotent — safe to call on every launch,
 * because the backend upserts on (user, token) rather than inserting.
 */
export async function registerDevice(body: RegisterDeviceBody): Promise<Device> {
  const { data } = await http.post<Device>(PATHS.devices.register, body);
  return data;
}

export async function fetchDevices(): Promise<Device[]> {
  const { data } = await http.get<Device[]>(PATHS.devices.list);
  return data;
}

export interface UpdateDevicePreferencesBody {
  pushToken: string;
  enabled?: boolean;
  enabledClasses?: NotificationClass[];
  quietHoursStartMinute?: number;
  quietHoursEndMinute?: number;
  timeZone?: string;
}

export async function updateDevicePreferences(
  body: UpdateDevicePreferencesBody,
): Promise<Device | null> {
  const { data } = await http.patch<Device | null>(PATHS.devices.preferences, body);
  return data;
}

/** Called on sign-out so a shared device stops receiving the previous user's alerts. */
export async function unregisterDevice(pushToken: string): Promise<{ removed: boolean }> {
  const { data } = await http.delete<{ removed: boolean }>(PATHS.devices.unregister(pushToken));
  return data;
}

/**
 * The VAPID public key browsers subscribe with. Served by the API rather than
 * baked into the build so rotating the pair never needs a web redeploy. Null
 * when the deployment has web push unconfigured — callers treat that as
 * "web push unavailable", not an error.
 */
export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const { data } = await http.get<{ publicKey: string }>(PATHS.devices.vapidPublicKey, {
      suppressErrorToast: true,
    });
    return data.publicKey || null;
  } catch {
    return null;
  }
}
