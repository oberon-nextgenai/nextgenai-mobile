import { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'dev' | 'staging' | 'prod';
const variant = (process.env.APP_VARIANT as Variant | undefined) ?? 'dev';

const NAME = 'Prime';
const SCHEME = 'primeai';
const BUNDLE_ID = 'ai.oberon.prime';

const apiOriginByVariant: Record<Variant, string> = {
  dev: process.env.API_ORIGIN_DEV ?? 'http://localhost:3000',
  staging: process.env.API_ORIGIN_STAGING ?? 'https://staging.api.oberon.ai',
  prod: process.env.API_ORIGIN_PROD ?? 'https://api.oberon.ai',
};

const nameSuffix: Record<Variant, string> = {
  dev: ' (Dev)',
  staging: ' (Staging)',
  prod: '',
};
const idSuffix: Record<Variant, string> = {
  dev: '.dev',
  staging: '.staging',
  prod: '',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: NAME + nameSuffix[variant],
  slug: 'oberon-nextgenai-mobile',
  owner: 'fabi0t',
  scheme: SCHEME,
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID + idSuffix[variant],
    usesAppleSignIn: true,
    infoPlist: {
      NSFaceIDUsageDescription:
        'Use Face ID to unlock Prime without re-entering your password.',
      NSMicrophoneUsageDescription:
        'Prime uses the microphone so you can talk to it and hear it reply.',
    },
  },
  android: {
    package: BUNDLE_ID + idSuffix[variant],
    permissions: ['RECORD_AUDIO'],
    adaptiveIcon: {
      backgroundColor: '#0B0F19',
    },
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    // Google Play requires targetSdk 36 (Android 16) since 31 Aug 2026. Expo SDK
    // 54's autolinking plugin still defaults to 35, so pin it explicitly here.
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
        },
      },
    ],
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    'expo-font',
    'expo-apple-authentication',
    'expo-asset',
    'expo-audio',
    'expo-web-browser',
    // Notification channels are created at runtime (lib/push/pushTokens.ts);
    // the plugin is what wires the native module into the build.
    'expo-notifications',
  ],
  experiments: {
    // Still off: expo-router's typegen emits a routeless stub for this route
    // tree (getRoutes() resolves 31 children, but groupRouteNodes() returns
    // empty, so every Href literal fails to compile). Unchanged from SDK 53 to
    // 54 -- needs its own fix, tracked separately from the SDK upgrade.
    typedRoutes: false,
  },
  extra: {
    variant,
    apiOrigin: apiOriginByVariant[variant],
    eas: {
      projectId: '4134c6ce-e259-4886-9de7-49462cfcd32a',
    },
  },
});
