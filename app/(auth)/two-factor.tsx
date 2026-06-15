import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppMark } from '@/components/brand/AppMark';
import { useTwoFactorLoginMutation } from '@/api/hooks/authHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

const schema = z.object({
  code: z.string().min(6, 'Enter your 6-digit code').max(8, 'Code looks too long'),
});
type FormValues = z.infer<typeof schema>;

export default function TwoFactorScreen() {
  const { tempToken, email } = useLocalSearchParams<{ tempToken?: string; email?: string }>();
  const verify = useTwoFactorLoginMutation();
  const { colors } = useThemeMode();

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(({ code }) => {
    if (!tempToken) return;
    verify.mutate({ tempToken, code });
  });

  const errorMsg =
    (verify.error as { response?: { data?: { message?: string } }; message?: string } | undefined)
      ?.response?.data?.message ?? (verify.error as Error | undefined)?.message;

  return (
    <Screen avoidKeyboard className="px-6">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
      >
        <View className="mb-10 items-start">
          <AppMark size={44} variant="full" />
        </View>

        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-3xl tracking-tight"
          style={{ fontFamily: 'Inter_700Bold' }}
        >
          Two-factor
        </Text>
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-sm mt-1 mb-6"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          {email
            ? `Enter the 6-digit code for ${email}`
            : 'Enter the 6-digit code from your authenticator app'}
        </Text>

        <View className="gap-3">
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Verification code"
                placeholder="123 456"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                value={value}
                onChangeText={onChange}
                error={fieldState.error?.message}
                maxLength={8}
                leftIcon={
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.fgMuted} />
                }
              />
            )}
          />

          {errorMsg ? (
            <View className="bg-danger-soft border border-danger/40 rounded-lg px-3 py-2">
              <Text className="text-danger text-sm" style={{ fontFamily: 'Inter_500Medium' }}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <Button onPress={onSubmit} loading={verify.isPending} fullWidth className="mt-2">
            Verify
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
