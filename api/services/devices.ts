import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';

/**
 * Device registry for push notifications.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/devices`. Delivery goes through the
 * Expo Push API server-side, so the only thing the client owns is its token and
 * its preferences.
 *
 * Note: obtaining the token requires `expo-notifications`, which is not yet a
 * dependency. These calls are ready for it; see `registerDevice`.
 */

/** The five classes the backend fans out. Each is separately mutable by the user. */
export const NOTIFICATION_CLASSES = ['critical', 'cost', 'sla_risk', 'workflow', 'brief'] as const;
export type NotificationClass = (typeof NOTIFICATION_CLASSES)[number];

export type DevicePlatform = 'ios' | 'android';

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
  /** Must be an Expo token — the backend rejects anything else. */
  pushToken: string;
  platform: DevicePlatform;
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
