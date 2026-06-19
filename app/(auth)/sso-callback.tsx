import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Screen } from '@/components/common/Screen';
import { AppMark } from '@/components/brand/AppMark';
import { exchangeMobileSso } from '@/api/services/auth';
import { useAuthStore } from '@/store/auth';
import { useThemeMode } from '@/hooks/useThemeMode';

/**
 * Web-only SSO landing route. The web SSO flow does a full-page redirect to the
 * provider; the backend redirects back here with a one-time token (`?token=`),
 * which we exchange for a real session. (Native uses the deep-link flow instead.)
 */
export default function SsoCallbackScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const setSession = useAuthStore((s) => s.setSession);
  const { token, error } = useLocalSearchParams<{ token?: string; error?: string }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const fail = (msg: string) => {
      Toast.show({ type: 'error', text1: 'Sign-in failed', text2: msg });
      router.replace('/(auth)/sign-in');
    };

    if (error) {
      fail(decodeURIComponent(String(error)));
      return;
    }
    if (!token) {
      fail('Missing sign-in token. Please try again.');
      return;
    }

    void (async () => {
      try {
        const result = await exchangeMobileSso(String(token));
        if (!result.access_token) throw new Error('No session returned.');
        await setSession(result.access_token, result.user);
        router.replace('/');
      } catch (e) {
        fail(e instanceof Error ? e.message : 'Could not complete sign-in.');
      }
    })();
  }, [token, error, router, setSession]);

  return (
    <Screen className="items-center justify-center px-6">
      <AppMark size={44} variant="full" />
      <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      <Text
        className="text-fg-muted dark:text-fg-dark-muted text-sm mt-3"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        Completing sign-in…
      </Text>
    </Screen>
  );
}
