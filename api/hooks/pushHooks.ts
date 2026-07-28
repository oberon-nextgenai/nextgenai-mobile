import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { QUERY_KEYS } from '@/lib/constants';
import {
  fetchDevices,
  registerDevice,
  unregisterDevice,
  updateDevicePreferences,
  type Device,
  type UpdateDevicePreferencesBody,
} from '@/api/services/devices';
import { deviceLabel, getExpoPushToken, routeForNotification } from '@/lib/push/pushTokens';
import { useActiveOrg } from '@/store/org';
import { useAuthStore } from '@/store/auth';

/**
 * Foreground presentation. Without this, a notification that arrives while the
 * app is open is swallowed — which is exactly when a critical escalation is most
 * likely to land, since the CEO is already looking at the app.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers this device for push and keeps the registration fresh.
 *
 * Mounted once, high in the tree. Registration is idempotent — the backend
 * upserts on (user, token) — so calling it on every launch is the intended
 * behaviour, not a redundancy.
 */
export function usePushRegistration(): void {
  const { activeOrgId } = useActiveOrg();
  const token = useAuthStore(s => s.token);
  // Guards against re-registering the same token on every render or org
  // reconciliation; the backend would absorb it, but the round trip is waste.
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    // Both are required: no session means no one to register for, and no org
    // means the backend has nothing to scope the device to.
    if (!token || !activeOrgId) return;

    let cancelled = false;

    void (async () => {
      const result = await getExpoPushToken();
      if (!result.ok || cancelled) return;

      const key = `${activeOrgId}:${result.token}`;
      if (registeredRef.current === key) return;

      try {
        await registerDevice({
          organizationId: activeOrgId,
          pushToken: result.token,
          platform: result.platform,
          appVersion: Constants.expoConfig?.version,
          deviceName: deviceLabel(),
          // The device's own zone, so quiet hours mean 22:00 wherever they are.
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (!cancelled) registeredRef.current = key;
      } catch {
        // Registration failing must not disturb the session. The next launch
        // retries, and everything except push keeps working meanwhile.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, activeOrgId]);
}

/**
 * Routes a tapped notification to the screen it refers to.
 *
 * Handles both directions: a tap while the app is running, and a cold start
 * where the notification is what launched the app. Missing the second case is
 * the classic bug — the deep link silently drops and the user lands on the home
 * screen wondering what they just tapped.
 */
export function usePushDeepLinks(): void {
  const router = useRouter();

  const open = useCallback(
    (data: unknown) => {
      const path = routeForNotification(data);
      if (path) router.push(path as never);
    },
    [router],
  );

  useEffect(() => {
    // Cold start: the app was launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) open(response.notification.request.content.data);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      open(response.notification.request.content.data);
    });

    return () => subscription.remove();
  }, [open]);
}

/** The devices registered to the signed-in user, for the notification settings screen. */
export function useDevices() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: QUERY_KEYS.devices,
    enabled: !!token,
    queryFn: fetchDevices,
  });
}

export function useUpdateDevicePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDevicePreferencesBody) => updateDevicePreferences(body),
    onSuccess: (device: Device | null) => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.devices });
      if (!device) {
        Toast.show({ type: 'error', text1: 'That device is no longer registered' });
      }
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Could not save your notification settings' });
    },
  });
}

/**
 * Unregisters this device. Call on sign-out so a shared or handed-on phone stops
 * receiving the previous user's escalations.
 *
 * Best-effort: a failure here must never block sign-out.
 */
export async function unregisterThisDevice(): Promise<void> {
  try {
    const result = await getExpoPushToken();
    if (result.ok) await unregisterDevice(result.token);
  } catch {
    // Signing out matters more than the bookkeeping.
  }
}
