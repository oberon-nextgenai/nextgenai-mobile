import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';

/**
 * Device registry for push notifications.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/devices`. Two transports server-side:
 * Expo Push for ios/android device tokens, and Web Push for the installed PWA.
 * Either way the client owns only its address and its preferences.
 */

/** The five classes the backend fans out. Each is separately mutable by the user. */
export const NOTIFICATION_CLASSES = ['critical', 'cost', 'sla_risk', 'workflow', 'brief'] as const;
export type NotificationClass = (typeof NOTIFICATION_CLASSES)[number];

export type DevicePlatform = 'ios' | 'android' | 'web';

/**
 * The keys a browser hands back with a Push subscription. Web Push encrypts
 * every payload to them, so a web registration without both is undeliverable —
 * which is why the backend requires them whenever `platform` is `web`.
 */
export interface WebPushKeys {
  p256dh: string;
  auth: string;
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
  /** An Expo token on ios/android; the Push subscription endpoint on web. */
  pushToken: string;
  platform: DevicePlatform;
  /** Required when `platform` is `web`, rejected otherwise. */
  webPushKeys?: WebPushKeys;
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
  const { data } = await http.delete<{ removed: boolean }>(PATHS.devices.unregister, {
    data: { pushToken },
  });
  return data;
}

/**
 * The server's VAPID public key, or `null` when web push is not configured.
 *
 * `null` is a normal answer, not an error: an environment with no VAPID keys
 * should leave the browser unsubscribed rather than holding a subscription
 * nothing can deliver to.
 */
export async function fetchWebPushPublicKey(): Promise<string | null> {
  const { data } = await http.get<{ publicKey: string | null }>(PATHS.devices.webPushPublicKey);
  return data.publicKey ?? null;
}
