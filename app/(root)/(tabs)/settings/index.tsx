import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { useLogoutMutation } from '@/api/hooks/authHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import { STORAGE_KEYS } from '@/lib/constants';
import { confirmAction } from '@/lib/confirm';
import { cn } from '@/lib/cn';

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

function Row({ icon, label, description, right, onPress, destructive }: RowProps) {
  const { colors } = useThemeMode();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3.5 mb-2 active:bg-accent-soft dark:active:bg-accent-soft-dark"
    >
      <View className="w-9 h-9 rounded-lg bg-surface-2 dark:bg-surface-2-dark items-center justify-center mr-3">
        <Ionicons
          name={icon}
          size={17}
          color={destructive ? colors.danger : colors.fg}
        />
      </View>
      <View className="flex-1">
        <Text
          className={cn(
            'text-sm',
            destructive ? 'text-danger' : 'text-fg dark:text-fg-dark-DEFAULT',
          )}
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
            style={{ fontFamily: 'Inter_400Regular' }}
            numberOfLines={1}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={14} color={colors.fgSubtle} />
        ) : null)}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-2 px-1"
      style={{ fontFamily: 'Inter_500Medium' }}
    >
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogoutMutation();
  const { appearance, mode, setAppearance } = useThemeMode();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);

  useEffect(() => {
    void (async () => {
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(supported && enrolled);
      const v = await AsyncStorage.getItem(STORAGE_KEYS.biometricEnabled);
      setBiometricEnabled(v === '1');
    })();
  }, []);

  const toggleBiometric = async (next: boolean) => {
    if (next) {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm biometric to enable',
      });
      if (!res.success) return;
    }
    setBiometricEnabled(next);
    await AsyncStorage.setItem(STORAGE_KEYS.biometricEnabled, next ? '1' : '0');
  };

  const appearanceLabel =
    appearance === 'system' ? 'System' : appearance === 'light' ? 'Light' : 'Dark';
  const variant =
    (Constants.expoConfig?.extra as { variant?: string } | undefined)?.variant ?? 'dev';

  const displayName =
    user?.name ??
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? 'Account');

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Settings" showOrgPill={false} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Profile card */}
        <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 mb-5">
          <View className="flex-row items-center">
            <Avatar name={displayName} size={56} />
            <View className="flex-1 ml-3">
              <Text
                className="text-fg dark:text-fg-dark-DEFAULT text-lg"
                style={{ fontFamily: 'Inter_700Bold' }}
              >
                {displayName}
              </Text>
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-xs"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {user?.email}
              </Text>
              {user?.role ? (
                <Text
                  className="text-fg-subtle dark:text-fg-dark-subtle text-[10px] uppercase tracking-widest mt-1"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {user.role.replace('_', ' ')}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <SectionLabel>Preferences</SectionLabel>
        <Row
          icon="finger-print"
          label="Biometric login"
          description={
            biometricSupported
              ? 'Unlock with Face ID / Touch ID after 5 min in background'
              : 'No biometrics enrolled on this device'
          }
          right={
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              disabled={!biometricSupported}
              trackColor={{ true: '#1E3A8A', false: '#E5E7EB' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E7EB"
            />
          }
        />
        <Row
          icon="contrast-outline"
          label="Appearance"
          description={`${appearanceLabel} · currently ${mode}`}
          onPress={() => setShowAppearance(true)}
        />
        <Row
          icon="notifications-outline"
          label="Notifications"
          description="Prime tool results and analytics events"
          onPress={() => router.push('/notifications' as never)}
        />

        <View className="h-3" />
        <SectionLabel>Account</SectionLabel>
        <Row
          icon="shield-checkmark-outline"
          label="Security"
          description="Two-factor authentication and password"
          onPress={() => router.push('/security' as never)}
        />

        <View className="h-3" />
        <SectionLabel>Workspace</SectionLabel>
        <Row
          icon="extension-puzzle-outline"
          label="Plugins & integrations"
          description="Marketplace and installed plugins"
          onPress={() => router.push('/plugins' as never)}
        />
        <Row
          icon="library-outline"
          label="Knowledge bases"
          description="Browse documents and chunks"
          onPress={() => router.push('/knowledge-bases' as never)}
        />
        <Row
          icon="megaphone-outline"
          label="Campaigns"
          description="Outbound campaign status"
          onPress={() => router.push('/campaigns' as never)}
        />

        <View className="h-6" />
        <Button
          variant="outline-danger"
          fullWidth
          loading={logout.isPending}
          onPress={() =>
            confirmAction({
              title: 'Sign out?',
              message: 'You will be returned to the login screen.',
              confirmLabel: 'Sign out',
              onConfirm: () => logout.mutate(),
            })
          }
        >
          Log out
        </Button>

        <Text
          className="text-fg-subtle dark:text-fg-dark-subtle text-[10px] text-center uppercase tracking-widest mt-6"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          Nextgen AI Prime · v0.1.0 · {variant}
        </Text>
      </ScrollView>

      {/* Appearance sheet */}
      {showAppearance ? (
        <Pressable
          onPress={() => setShowAppearance(false)}
          className="absolute inset-0 bg-fg/40 dark:bg-bg-dark/60 z-40 justify-end"
        >
          <Pressable className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark rounded-t-3xl p-5">
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-base mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Appearance
            </Text>
            {(['system', 'light', 'dark'] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={async () => {
                  await setAppearance(opt);
                  setShowAppearance(false);
                }}
                className={cn(
                  'flex-row items-center justify-between rounded-lg px-3 py-3 mb-2',
                  appearance === opt
                    ? 'bg-accent-soft dark:bg-accent-soft-dark'
                    : 'bg-surface-2 dark:bg-surface-2-dark',
                )}
              >
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm capitalize"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {opt}
                </Text>
                {appearance === opt ? (
                  <Ionicons name="checkmark" size={18} color="#1E3A8A" />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      ) : null}
    </Screen>
  );
}
