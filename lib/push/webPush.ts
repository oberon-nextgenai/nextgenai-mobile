import { Platform } from 'react-native';

/**
 * Browser Web Push subscription — the web sibling of `pushTokens.ts`.
 *
 * Same contract as `getExpoPushToken`: never throws, and failures come back as
 * typed reasons so the UI can say something specific. The permission prompt is
 * the one piece the platform forces on us: browsers only allow it from a user
 * gesture, which is why `requestPermission` is an explicit opt-in flag driven
 * by the Approvals tab's enable card rather than something this module decides.
 */

export type WebPushFailure =
  | 'not_web'
  | 'unsupported'
  | 'permission_denied'
  | 'no_vapid_key'
  | 'subscribe_failed';

export interface WebPushSubscriptionResult {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type WebPushSubscribeResult =
  | { ok: true; subscription: WebPushSubscriptionResult }
  | { ok: false; reason: WebPushFailure };

/** Feature-detects the whole pipeline: SW + Push API + Notification. */
export function webPushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Current browser permission, or null off-web / unsupported. `'default'` means
 * "never asked" — the only state where the enable card should appear.
 */
export function webNotificationPermission(): NotificationPermission | null {
  if (!webPushSupported()) return null;
  return Notification.permission;
}

/** VAPID keys are URL-safe base64; `PushManager.subscribe` wants raw bytes. */
// `Uint8Array<ArrayBuffer>`, not a bare `Uint8Array`: since TS 5.7 the bare
// form widens to `ArrayBufferLike`, which admits `SharedArrayBuffer` and so no
// longer satisfies `BufferSource` at the `pushManager.subscribe` call below.
// The value here is always plain-buffer backed — this states that.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

interface SubscribeOptions {
  /** Injected so this module stays free of the HTTP layer (and testable). */
  getVapidPublicKey: () => Promise<string | null>;
  /**
   * true → may show the browser permission prompt. Only pass true from a user
   * gesture; the silent relaunch path passes false and succeeds only when
   * permission was granted before.
   */
  requestPermission: boolean;
}

/**
 * Register the service worker and return this browser's push subscription.
 * Reuses an existing subscription when one is live, so calling on every launch
 * is as idempotent as the native token path.
 */
export async function subscribeWebPush(opts: SubscribeOptions): Promise<WebPushSubscribeResult> {
  if (Platform.OS !== 'web') return { ok: false, reason: 'not_web' };
  if (!webPushSupported()) return { ok: false, reason: 'unsupported' };

  try {
    let permission = Notification.permission;
    if (permission === 'default' && opts.requestPermission) {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return { ok: false, reason: 'permission_denied' };

    const key = await opts.getVapidPublicKey();
    if (!key) return { ok: false, reason: 'no_vapid_key' };

    const registration = await navigator.serviceWorker.register('/sw.js');
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: 'subscribe_failed' };
    }
    return {
      ok: true,
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
    };
  } catch {
    return { ok: false, reason: 'subscribe_failed' };
  }
}

/**
 * Install the service worker, independently of any push subscription.
 *
 * `subscribeWebPush` registers it too, but only after permission is granted —
 * so without this the worker never installs for anyone who has not enabled
 * notifications, and the installed PWA has no worker at all. Registering early
 * also means the worker is already active when permission is finally granted,
 * so the first subscription does not race its activation.
 *
 * Never throws: a failed registration costs notifications, not the app.
 */
export async function ensureServiceWorker(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    await navigator.serviceWorker.register('/sw.js');
    return true;
  } catch {
    return false;
  }
}

/**
 * The endpoint of this browser's live subscription, if any — what sign-out
 * needs to unregister the device row without re-running the permission dance.
 */
export async function getWebPushEndpoint(): Promise<string | null> {
  if (!webPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}
