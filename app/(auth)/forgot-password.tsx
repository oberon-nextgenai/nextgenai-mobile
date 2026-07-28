import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { GradientButton } from '@/components/ui/GradientButton';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { AppMark } from '@/components/brand/AppMark';
import { requestPasswordReset } from '@/api/services/auth';
import { useThemeMode } from '@/hooks/useThemeMode';

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
    onSuccess: (_data, email) => {
      Toast.show({
        type: 'success',
        text1: 'Check your email',
        text2: 'We sent a password reset link.',
      });
      // Continue to the confirm screen so the user can paste the token from the
      // email and set a new password without leaving the app.
      router.push({ pathname: '/(auth)/reset-password', params: { email } });
    },
  });

  const onSubmit = handleSubmit(({ email }) => mutation.mutate(email));

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
            Reset password
          </Text>
          <Text variant="body.sm" tone="muted" className="mt-2 text-center">
            Enter your account email and we&apos;ll send you a reset link.
          </Text>
        </View>

        <View className="gap-3">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Email"
                placeholder="you@nextgen.ai"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={value}
                onChangeText={onChange}
                error={fieldState.error?.message}
                leftIcon={<Ionicons name="mail-outline" size={16} color={colors.fgMuted} />}
              />
            )}
          />

          <GradientButton onPress={onSubmit} loading={mutation.isPending} fullWidth className="mt-2">
            Send reset link
          </GradientButton>
        </View>
      </ScrollView>
    </Screen>
  );
}
