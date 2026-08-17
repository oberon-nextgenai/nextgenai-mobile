/**
 * Web Push service worker (ND-1355).
 *
 * Receives VAPID pushes from the API's devices fan-out and does two things:
 * shows the OS notification, and messages any open tabs so the Approvals badge
 * and list refresh immediately (the app listens in useWebPushMessages).
 *
 * Payload shape mirrors the native Expo message, built by the API's
 * DevicesService.buildWebPayload: { title, body, data: { deepLink, class, … }, badge }.
 *
 * Deep links arrive as `primeai://approvals/<id>`; on web the same path minus
 * the scheme is the real URL, because expo-router strips route groups from web
 * URLs. This mapping mirrors lib/push/pushTokens.ts `routeForNotification` —
 * keep the two in sync.
 */

const SCHEME_PREFIX = 'primeai://';

function pathFromDeepLink(deepLink) {
  if (typeof deepLink !== 'string' || !deepLink.startsWith(SCHEME_PREFIX)) return null;
  const path = deepLink.slice(SCHEME_PREFIX.length);
  return path ? `/${path}` : null;
}

self.addEventListener('install', () => {
  // A waiting worker would keep serving the old push logic until every tab
  // closes; approvals are too time-sensitive for that.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const data = payload.data || {};

  event.waitUntil(
    (async () => {
      // Open tabs first: the in-app badge should move even if the user never
      // looks at the OS notification.
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const tab of tabs) {
        tab.postMessage({ type: 'escalation', deepLink: data.deepLink || null });
      }

      await self.registration.showNotification(payload.title || 'Prime', {
        body: payload.body || '',
        data,
        // One notification per approval: a re-send for the same item replaces
        // the stale copy instead of stacking.
        tag: typeof data.deepLink === 'string' ? data.deepLink : undefined,
        icon: '/icons/icon-512.png',
        badge: '/icons/icon-512.png',
      });
    })(),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = pathFromDeepLink(event.notification.data && event.notification.data.deepLink);
  const target = path || '/approvals';

  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const tab of tabs) {
        if ('focus' in tab) {
          await tab.focus();
          // The app navigates itself — a location change would reload the SPA.
          tab.postMessage({ type: 'navigate', path: target });
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
