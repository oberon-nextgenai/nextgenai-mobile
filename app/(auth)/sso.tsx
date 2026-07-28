import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Screen } from '@/components/common/Screen';
import { AppMark } from '@/components/brand/AppMark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useSSOLoginMutation } from '@/api/hooks/authHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

type Provider = 'google' | 'microsoft' | 'apple';

export default function SSOScreen() {
  const router = useRouter();
  const { colors, mode } = useThemeMode();
  const sso = useSSOLoginMutation();
  const [pending, setPending] = useState<Provider | null>(null);

  const start = async (provider: Provider) => {
    setPending(provider);
    try {
      await sso.mutateAsync(provider);
    } finally {
      setPending(null);
    }
  };

  const errorMsg =
    (sso.error as { response?: { data?: { message?: string } }; message?: string } | undefined)
      ?.response?.data?.message ?? (sso.error as Error | undefined)?.message;

  return (
    <Screen background="nebula" className="px-6">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
      >
        <Pressable onPress={() => router.back()} className="mb-6 self-start flex-row items-center">
          <Ionicons name="chevron-back" size={18} color={colors.fg} />
          <Text variant="body.medium" className="ml-1">
            Back
          </Text>
        </Pressable>

        {/* Brand block — centred, matching the migrated sign-in screen. */}
        <View className="items-center mb-9">
          <AppMark size={44} variant="full" />
          <Text variant="display.lg" className="mt-6 text-center">
            Single sign-on
          </Text>
          <Text variant="body.sm" tone="muted" className="mt-2 text-center">
            Continue with your work identity provider
          </Text>
        </View>

        <View className="gap-3">
          <Button
            variant="secondary"
            fullWidth
            loading={pending === 'google'}
            disabled={pending !== null}
            onPress={() => start('google')}
            leftIcon={<Ionicons name="logo-google" size={16} color={colors.fg} />}
          >
            Continue with Google
          </Button>

          <Button
            variant="secondary"
            fullWidth
            loading={pending === 'microsoft'}
            disabled={pending !== null}
            onPress={() => start('microsoft')}
            leftIcon={<Ionicons name="logo-microsoft" size={16} color={colors.fg} />}
          >
            Continue with Microsoft
          </Button>

          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                mode === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={{ width: '100%', height: 48 }}
              onPress={() => start('apple')}
            />
          ) : null}

          {errorMsg ? (
            <Card variant="plain" padding="sm" style={{ backgroundColor: colors.dangerSoft }}>
              <Text variant="body.sm" tone="danger">
                {errorMsg}
              </Text>
            </Card>
          ) : null}

          <View className="flex-row items-start mt-4 opacity-80">
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={colors.fgMuted}
              style={{ marginTop: 2 }}
            />
            <Text variant="body.xs" tone="muted" className="ml-1.5 flex-1">
              You will be redirected to your provider. After authenticating, you&apos;ll be returned
              to Prime automatically.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
