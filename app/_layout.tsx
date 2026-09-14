import { useEffect } from 'react';
import 'react-native-url-polyfill/auto';
import '@/global.css';
// Side-effect import: registers `Animated.View` with NativeWind so its
// `className` props resolve. Must run before any screen renders.
import '@/lib/nativewindInterop';
import { ActivityIndicator, Pressable, Text, View, AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ui/Toast';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { useAppInit } from '@/hooks/useAppInit';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useThemeStore } from '@/store/theme';
import { setUnauthorizedHandler } from '@/api/client/http';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});

focusManager.setEventListener((handleFocus) => {
  const onChange = (status: AppStateStatus) => handleFocus(status === 'active');
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
});

/**
 * Root crash screen. Without this, any uncaught render error unmounts the whole
 * tree — on web that is a plain white page, mid-demo, with no way back but a
 * reload. Deliberately self-contained: no theme hook, no styled components —
 * nothing here may depend on state that might itself be what crashed.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // No logger/Sentry wired up in this repo yet — this is the only record of
  // the crash, so it must not be silently dropped.
  console.error('[root] uncaught render error', error);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0B0F19',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
        Something went wrong
      </Text>
      <Text style={{ color: '#9BA0AE', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
        A screen failed to render. Your data is safe.
      </Text>
      {__DEV__ ? (
        <Text style={{ color: '#F87171', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>
          {error.message}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={{
          backgroundColor: '#5B3DF5',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const storesReady = useAppInit();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const themeHydrated = useThemeStore((s) => s.hydrated);
  const { mode, colors } = useThemeMode();
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clear);
  const clearOrg = useOrgStore((s) => s.clear);

  // Three families, three jobs (see constants/Typography.ts):
  // Newsreader = the answer · Inter = the explanation · JetBrains Mono = the provenance.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_400Regular_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    void hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void (async () => {
        await Promise.all([clearAuth(), clearOrg()]);
        queryClient.clear();
        router.replace('/(auth)/sign-in');
      })();
    });
    return () => setUnauthorizedHandler(null);
  }, [router, clearAuth, clearOrg]);

  const ready = storesReady && themeHydrated && fontsLoaded;

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          />
          <Toast config={toastConfig} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
