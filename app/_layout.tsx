import { useEffect } from 'react';
import 'react-native-url-polyfill/auto';
import '@/global.css';
import { ActivityIndicator, View, AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
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

export default function RootLayout() {
  const storesReady = useAppInit();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const themeHydrated = useThemeStore((s) => s.hydrated);
  const { mode, colors } = useThemeMode();
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clear);
  const clearOrg = useOrgStore((s) => s.clear);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
