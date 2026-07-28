import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { GradientButton } from '@/components/ui/GradientButton';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
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
    <Screen background="nebula" avoidKeyboard className="px-6">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
      >
        {/* Brand block — centred, matching the migrated sign-in screen. */}
        <View className="items-center mb-9">
          <AppMark size={44} variant="full" />
          <Text variant="display.lg" className="mt-6 text-center">
            Two-factor
          </Text>
          <Text variant="mono.value" tone="muted" className="mt-2 text-center">
            {email
              ? `Enter the 6-digit code for ${email}`
              : 'Enter the 6-digit code from your authenticator app'}
          </Text>
        </View>

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
            <Card variant="plain" padding="sm" style={{ backgroundColor: colors.dangerSoft }}>
              <Text variant="body.sm" tone="danger">
                {errorMsg}
              </Text>
            </Card>
          ) : null}

          <GradientButton onPress={onSubmit} loading={verify.isPending} fullWidth className="mt-2">
            Verify
          </GradientButton>
        </View>
      </ScrollView>
    </Screen>
  );
}
