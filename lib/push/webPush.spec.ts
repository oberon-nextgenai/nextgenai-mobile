import { Platform } from 'react-native';
import { getWebPushEndpoint, subscribeWebPush, webNotificationPermission } from './webPush';

/**
 * The browser globals are stubbed per test: jest-expo runs in a node-flavoured
 * environment where none of the push APIs exist, which is convenient — every
 * capability the module feature-detects has to be provided explicitly, so a
 * test can remove exactly one and watch the typed failure come back.
 */

const SUBSCRIPTION_JSON = {
  endpoint: 'https://push.example/sub-1',
  keys: { p256dh: 'client-public', auth: 'client-auth' },
};

function makeSubscription(json: typeof SUBSCRIPTION_JSON = SUBSCRIPTION_JSON) {
  return { endpoint: json.endpoint, toJSON: () => json };
}

interface InstallOptions {
  permission?: NotificationPermission;
  promptAnswer?: NotificationPermission;
  existing?: ReturnType<typeof makeSubscription> | null;
}

const savedGlobals: [string, PropertyDescriptor | undefined][] = [];

function setGlobal(name: string, value: unknown) {
  if (!savedGlobals.some(([saved]) => saved === name)) {
    savedGlobals.push([name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  }
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function restoreGlobals() {
  for (const [name, descriptor] of savedGlobals.splice(0)) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete (globalThis as Record<string, unknown>)[name];
  }
}

function installWebGlobals({
  permission = 'default',
  promptAnswer = 'granted',
  existing = null,
}: InstallOptions = {}) {
  const registration = {
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue(existing),
      subscribe: jest.fn().mockResolvedValue(makeSubscription()),
    },
  };
  const serviceWorker = {
    register: jest.fn().mockResolvedValue(registration),
    getRegistration: jest.fn().mockResolvedValue(registration),
  };
  const notification = {
    permission,
    requestPermission: jest.fn().mockImplementation(async () => {
      notification.permission = promptAnswer;
      return promptAnswer;
    }),
  };

  setGlobal('navigator', { serviceWorker });
  setGlobal('window', { PushManager: class {}, Notification: notification });
  setGlobal('Notification', notification);

  return { registration, serviceWorker, notification };
}

const getKey = () => Promise.resolve('dGVzdC1rZXk'); // "test-key", URL-safe base64

let osSpy: { restore(): void } | undefined;

function onWeb() {
  osSpy = jest.replaceProperty(Platform, 'OS', 'web');
}

afterEach(() => {
  osSpy?.restore();
  osSpy = undefined;
  restoreGlobals();
});

describe('subscribeWebPush', () => {
  it('is a typed no-op off web', async () => {
    await expect(
      subscribeWebPush({ getVapidPublicKey: getKey, requestPermission: true }),
    ).resolves.toEqual({ ok: false, reason: 'not_web' });
  });

  it('reports unsupported when the browser lacks the push pipeline', async () => {
    onWeb();
    setGlobal('navigator', {}); // no serviceWorker
    setGlobal('window', {});

    await expect(
      subscribeWebPush({ getVapidPublicKey: getKey, requestPermission: true }),
    ).resolves.toEqual({ ok: false, reason: 'unsupported' });
  });

  it('never prompts from the silent path — undecided permission is a denial there', async () => {
    onWeb();
    const { notification, serviceWorker } = installWebGlobals({ permission: 'default' });

    await expect(
      subscribeWebPush({ getVapidPublicKey: getKey, requestPermission: false }),
    ).resolves.toEqual({ ok: false, reason: 'permission_denied' });
    expect(notification.requestPermission).not.toHaveBeenCalled();
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  it('prompts from the gesture path and subscribes once granted', async () => {
    onWeb();
    const { notification, serviceWorker, registration } = installWebGlobals({
      permission: 'default',
      promptAnswer: 'granted',
    });

    const result = await subscribeWebPush({ getVapidPublicKey: getKey, requestPermission: true });

    expect(notification.requestPermission).toHaveBeenCalledTimes(1);
    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(result).toEqual({ ok: true, subscription: SUBSCRIPTION_JSON });
  });

  it('respects a refusal at the prompt', async () => {
    onWeb();
    installWebGlobals({ permission: 'default', promptAnswer: 'denied' });

    await expect(
      subscribeWebPush({ getVapidPublicKey: getKey, requestPermission: true }),
    ).resolves.toEqual({ ok: false, reason: 'permission_denied' });
  });

  it('reuses a live subscription instead of minting a second one', async () => {
    onWeb();
    const { registration } = installWebGlobals({
      permission: 'granted',
      existing: makeSubscription(),
    });

    const result = await subscribeWebPush({ getVapidPublicKey: getKey, requestPermission: false });

    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, subscription: SUBSCRIPTION_JSON });
  });

  it('fails typed when the deployment has no VAPID key', async () => {
    onWeb();
    installWebGlobals({ permission: 'granted' });

    await expect(
      subscribeWebPush({ getVapidPublicKey: () => Promise.resolve(null), requestPermission: false }),
    ).resolves.toEqual({ ok: false, reason: 'no_vapid_key' });
  });

  it('maps a subscribe crash to subscribe_failed rather than throwing', async () => {
    onWeb();
    const { registration } = installWebGlobals({ permission: 'granted' });
    registration.pushManager.subscribe.mockRejectedValue(new Error('push service down'));

    await expect(
      subscribeWebPush({ getVapidPublicKey: getKey, requestPermission: false }),
    ).resolves.toEqual({ ok: false, reason: 'subscribe_failed' });
  });
});

describe('webNotificationPermission', () => {
  it('is null anywhere the pipeline is missing', () => {
    expect(webNotificationPermission()).toBeNull();
  });

  it('reflects the browser permission on web', () => {
    onWeb();
    installWebGlobals({ permission: 'granted' });

    expect(webNotificationPermission()).toBe('granted');
  });
});

describe('getWebPushEndpoint', () => {
  it('returns the live endpoint for sign-out bookkeeping', async () => {
    onWeb();
    installWebGlobals({ permission: 'granted', existing: makeSubscription() });

    await expect(getWebPushEndpoint()).resolves.toBe(SUBSCRIPTION_JSON.endpoint);
  });

  it('returns null when there is no subscription', async () => {
    onWeb();
    installWebGlobals({ permission: 'granted' });

    await expect(getWebPushEndpoint()).resolves.toBeNull();
  });
});
