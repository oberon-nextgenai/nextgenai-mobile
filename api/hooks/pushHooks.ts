import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getNotifications } from '@/lib/push/notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { QUERY_KEYS } from '@/lib/constants';
import {
  fetchDevices,
  fetchWebPushPublicKey,
  registerDevice,
  unregisterDevice,
  updateDevicePreferences,
  type Device,
  type RegisterDeviceBody,
  type UpdateDevicePreferencesBody,
} from '@/api/services/devices';
import { deviceLabel, getExpoPushToken, routeForNotification } from '@/lib/push/pushTokens';
import {
  ensureServiceWorker,
  getWebPushEndpoint,
  subscribeWebPush,
  webPushSupported,
  type WebPushFailure,
} from '@/lib/push/webPush';
import { useActiveOrg } from '@/store/org';
import { useAuthStore } from '@/store/auth';

/**
 * Foreground presentation. Without this, a notification that arrives while the
 * app is open is swallowed — which is exactly when a critical escalation is most
 * likely to land, since the CEO is already looking at the app.
 */
const notifications = getNotifications();

notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * The registration body for whichever transport this platform uses, or `null`
 * when this device cannot receive push at all.
 *
 * Web never prompts here. Browsers only allow `Notification.requestPermission()`
 * from a user gesture, and a mount effect is not one — so this silently reuses
 * an existing grant and leaves asking to `useEnableWebPush`, which a button
 * drives. Calling with `requestPermission: true` from here would be refused by
 * the browser and would burn the one prompt Safari allows.
 */
async function buildRegistration(organizationId: string): Promise<RegisterDeviceBody | null> {
  const shared = {
    organizationId,
    appVersion: Constants.expoConfig?.version,
    deviceName: deviceLabel(),
    // The device's own zone, so quiet hours mean 22:00 wherever they are.
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  if (Platform.OS === 'web') {
    const result = await subscribeWebPush({
      getVapidPublicKey: fetchWebPushPublicKey,
      requestPermission: false,
    });
    if (!result.ok) return null;
    return {
      ...shared,
      pushToken: result.subscription.endpoint,
      platform: 'web',
      webPushKeys: result.subscription.keys,
    };
  }

  const result = await getExpoPushToken();
  if (!result.ok) return null;
  return { ...shared, pushToken: result.token, platform: result.platform };
}

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
      const body = await buildRegistration(activeOrgId);
      if (!body || cancelled) return;

      const key = `${activeOrgId}:${body.pushToken}`;
      if (registeredRef.current === key) return;

      try {
        await registerDevice(body);
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
    // `expo-notifications` has no web implementation: calling into it throws
    // "not available on web", which took down the whole authenticated shell in
    // a browser and made the app impossible to preview with `expo start --web`.
    // The browser has its own path — `public/sw.js` posts to every open tab on
    // a push, and again on notificationclick — so web listens there instead.
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

      const onMessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; path?: string } | null;
        // sw.js posts TWO different things, and only one of them is a
        // navigation. `escalation` fires when a push ARRIVES, so acting on it
        // would yank the screen out from under someone who never tapped
        // anything; the badge refresh it exists for is handled by the queries
        // invalidating on focus. `navigate` fires on notificationclick — a
        // deliberate tap — and carries a path already stripped of the
        // `primeai://` scheme by the worker.
        if (data?.type !== 'navigate' || typeof data.path !== 'string' || !data.path) return;
        router.push(data.path as never);
      };

      navigator.serviceWorker.addEventListener('message', onMessage);
      return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }

    // Expo Go on Android cannot load the module at all (see
    // `@/lib/push/notifications`), so there is nothing to listen to there.
    if (!notifications) return;

    // Cold start: the app was launched by tapping a notification.
    void notifications.getLastNotificationResponseAsync().then(response => {
      if (response) open(response.notification.request.content.data);
    });

    const subscription = notifications.addNotificationResponseReceivedListener(response => {
      open(response.notification.request.content.data);
    });

    return () => subscription.remove();
    // `router` is used by the web branch above; `open` by the native one.
  }, [open, router]);
}

/**
 * Installs the service worker on web, once, on mount.
 *
 * Separate from subscribing: the worker should exist for an installed PWA even
 * before anyone enables notifications, and having it already active means the
 * first subscription does not race its activation. A no-op everywhere else.
 */
export function useWebServiceWorker(): void {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    void ensureServiceWorker();
  }, []);
}

export type EnableWebPushOutcome = 'enabled' | 'unsupported' | WebPushFailure;

/**
 * Turns on browser notifications from a user gesture.
 *
 * This is the only place that may prompt: browsers refuse
 * `Notification.requestPermission()` outside a user gesture, and Safari allows
 * exactly one prompt ever — so it must be spent on a deliberate tap, never on a
 * mount effect. Call the returned function directly from an `onPress`.
 */
export function useEnableWebPush(): (organizationId: string) => Promise<EnableWebPushOutcome> {
  const queryClient = useQueryClient();

  return useCallback(
    async (organizationId: string): Promise<EnableWebPushOutcome> => {
      if (Platform.OS !== 'web' || !webPushSupported()) return 'unsupported';

      const result = await subscribeWebPush({
        getVapidPublicKey: fetchWebPushPublicKey,
        requestPermission: true,
      });
      if (!result.ok) return result.reason;

      await registerDevice({
        organizationId,
        pushToken: result.subscription.endpoint,
        platform: 'web',
        webPushKeys: result.subscription.keys,
        appVersion: Constants.expoConfig?.version,
        deviceName: deviceLabel(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.devices });
      return 'enabled';
    },
    [queryClient],
  );
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
    if (Platform.OS === 'web') {
      // Read the live subscription rather than re-running the permission dance:
      // sign-out is not a user gesture for notifications.
      const endpoint = await getWebPushEndpoint();
      if (endpoint) await unregisterDevice(endpoint);
      return;
    }
    const result = await getExpoPushToken();
    if (result.ok) await unregisterDevice(result.token);
  } catch {
    // Signing out matters more than the bookkeeping.
  }
}
