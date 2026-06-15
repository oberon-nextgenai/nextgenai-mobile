import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppMark } from '@/components/brand/AppMark';
import { Button } from '@/components/ui/Button';
import { useSSOLoginMutation } from '@/api/hooks/authHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

type Provider = 'google' | 'microsoft';

export default function SSOScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
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
    <Screen className="px-6">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
      >
        <Pressable onPress={() => router.back()} className="mb-6 self-start flex-row items-center">
          <Ionicons name="chevron-back" size={18} color={colors.fg} />
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-sm ml-1"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Back
          </Text>
        </Pressable>

        <View className="mb-10 items-start">
          <AppMark size={44} variant="full" />
        </View>

        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-3xl tracking-tight"
          style={{ fontFamily: 'Inter_700Bold' }}
        >
          Single sign-on
        </Text>
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-sm mt-1 mb-6"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          Continue with your work identity provider
        </Text>

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

          {errorMsg ? (
            <View className="bg-danger-soft border border-danger/40 rounded-lg px-3 py-2">
              <Text className="text-danger text-sm" style={{ fontFamily: 'Inter_500Medium' }}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-start mt-4 opacity-80">
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={colors.fgMuted}
              style={{ marginTop: 2 }}
            />
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-xs ml-1.5 flex-1 leading-4"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              You will be redirected to your provider. After authenticating, you'll be returned to
              Prime automatically.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
