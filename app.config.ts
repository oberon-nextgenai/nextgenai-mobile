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
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID + idSuffix[variant],
    usesAppleSignIn: true,
    infoPlist: {
      NSFaceIDUsageDescription:
        'Use Face ID to unlock Prime without re-entering your password.',
    },
  },
  android: {
    package: BUNDLE_ID + idSuffix[variant],
    adaptiveIcon: {
      backgroundColor: '#0B0F19',
    },
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    'expo-font',
    'expo-apple-authentication',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    variant,
    apiOrigin: apiOriginByVariant[variant],
    eas: {
      projectId: '4134c6ce-e259-4886-9de7-49462cfcd32a',
    },
  },
});
