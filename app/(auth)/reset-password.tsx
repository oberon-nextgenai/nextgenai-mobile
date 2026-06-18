import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppMark } from '@/components/brand/AppMark';
import { confirmPasswordReset } from '@/api/services/auth';
import { useThemeMode } from '@/hooks/useThemeMode';

const PASSWORD_HELP =
  '8–128 characters with an uppercase, lowercase, number, and special character.';
const strongPassword = (v: string) =>
  v.length >= 8 &&
  v.length <= 128 &&
  /[A-Z]/.test(v) &&
  /[a-z]/.test(v) &&
  /[0-9]/.test(v) &&
  /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(v);

const schema = z
  .object({
    token: z.string().trim().length(43, 'Paste the 43-character token from the email link.'),
    newPassword: z.string().refine(strongPassword, PASSWORD_HELP),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const params = useLocalSearchParams<{ token?: string }>();

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: typeof params.token === 'string' ? params.token : '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (vars: { token: string; newPassword: string }) =>
      confirmPasswordReset(vars.token, vars.newPassword),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Password updated',
        text2: 'Sign in with your new password.',
      });
      router.replace('/(auth)/sign-in');
    },
    onError: (e) =>
      Toast.show({
        type: 'error',
        text1: 'Could not reset password',
        text2:
          (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ?? (e as Error)?.message ?? 'Invalid or expired token.',
      }),
  });

  const onSubmit = handleSubmit(({ token, newPassword }) =>
    mutation.mutate({ token: token.trim(), newPassword }),
  );

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
          Set a new password
        </Text>
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-sm mt-1 mb-6"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          Paste the token from your reset email, then choose a new password.
        </Text>

        <View className="gap-3">
          <Controller
            control={control}
            name="token"
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Reset token"
                placeholder="From the reset email link"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                error={fieldState.error?.message}
                leftIcon={<Ionicons name="key-outline" size={16} color={colors.fgMuted} />}
              />
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="New password"
                placeholder="New password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                value={value}
                onChangeText={onChange}
                error={fieldState.error?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={16} color={colors.fgMuted} />}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Confirm password"
                placeholder="Re-enter new password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                value={value}
                onChangeText={onChange}
                error={fieldState.error?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={16} color={colors.fgMuted} />}
              />
            )}
          />

          <Button onPress={onSubmit} loading={mutation.isPending} fullWidth className="mt-2">
            Reset password
          </Button>

          <Button variant="ghost" fullWidth onPress={() => router.replace('/(auth)/sign-in')}>
            Back to sign in
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
