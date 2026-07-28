import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';
import { useMeQuery, useOrganizationsQuery } from '@/api/hooks/authHooks';
import { usePushDeepLinks, usePushRegistration } from '@/api/hooks/pushHooks';
import { useBiometricUnlock } from '@/hooks/useBiometricUnlock';
import { useThemeMode } from '@/hooks/useThemeMode';
import { BiometricGate } from '@/components/common/BiometricGate';

export default function RootAreaLayout() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const reconcile = useOrgStore((s) => s.reconcile);
  const { locked, authenticate } = useBiometricUnlock();
  const { colors } = useThemeMode();

  const meQuery = useMeQuery(Boolean(token));
  const orgsQuery = useOrganizationsQuery(Boolean(token));

  useEffect(() => {
    if (meQuery.data) {
      void setUser(meQuery.data);
    }
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (orgsQuery.data && meQuery.data) {
      void reconcile({
        organizations: orgsQuery.data,
        preferredOrgId: meQuery.data.organizationId ?? null,
      });
    }
  }, [orgsQuery.data, meQuery.data, reconcile]);

  // Registers this device for push and routes tapped notifications. Both are
  // hooks, so they must run before any early return — they no-op until there is
  // a session and an active organization.
  usePushRegistration();
  usePushDeepLinks();

  if (!token) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (meQuery.isPending || orgsQuery.isPending) {
    return (
      <View
        className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark"
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="command-search"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="org-switcher"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="tool-result/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="agents/edit-prompt/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="agents/new"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        {/* The audit receipt is a modal: it is the confirmation of a decision you
            just made, not a place you navigate to. */}
        <Stack.Screen
          name="approval-receipt/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="notification-preferences"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="board-update" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="communications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="outcomes" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="security" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="campaigns/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="campaigns/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="knowledge-bases/index"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="knowledge-bases/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="plugins/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="plugins/install/[type]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="plugins/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
      {locked ? <BiometricGate onAuthenticate={authenticate} /> : null}
    </>
  );
}
