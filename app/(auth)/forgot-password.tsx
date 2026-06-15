import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Check your email',
        text2: 'We sent a password reset link.',
      });
      router.back();
    },
  });

  const onSubmit = handleSubmit(({ email }) => mutation.mutate(email));

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
          Reset password
        </Text>
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-sm mt-1 mb-6"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          Enter your account email and we&apos;ll send you a reset link.
        </Text>

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

          <Button onPress={onSubmit} loading={mutation.isPending} fullWidth className="mt-2">
            Send reset link
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
