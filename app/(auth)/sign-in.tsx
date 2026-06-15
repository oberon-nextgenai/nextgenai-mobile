import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { AppMark } from '@/components/brand/AppMark';
import { useLoginMutation } from '@/api/hooks/authHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

const REMEMBER_KEY = 'oberon.rememberedEmail';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const login = useLoginMutation();

  const { control, handleSubmit, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Restore remembered email on mount.
  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(REMEMBER_KEY);
      if (stored) {
        setValue('email', stored);
        setRememberMe(true);
      }
    })();
  }, [setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (rememberMe) {
      await AsyncStorage.setItem(REMEMBER_KEY, values.email);
    } else {
      await AsyncStorage.removeItem(REMEMBER_KEY);
    }
    login.mutate(values);
  });

  const errorMsg =
    (login.error as { response?: { data?: { message?: string } }; message?: string } | undefined)
      ?.response?.data?.message ?? (login.error as Error | undefined)?.message;

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
          Welcome back
        </Text>
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-sm mt-1 mb-6"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          Sign in to continue
        </Text>

        <View className="gap-3">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
                leftIcon={<Ionicons name="mail-outline" size={16} color={colors.fgMuted} />}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                label="Password"
                placeholder="Your password"
                secureTextEntry={!showPassword}
                textContentType="password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={16} color={colors.fgMuted} />
                }
                rightIcon={
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={colors.fgMuted}
                  />
                }
                onPressRightIcon={() => setShowPassword((v) => !v)}
              />
            )}
          />

          <View className="flex-row items-center justify-between mt-1">
            <Checkbox checked={rememberMe} onChange={setRememberMe} label="Remember me" />
            <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
              <Text
                className="text-accent dark:text-accent-dark text-sm"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Forgot password?
              </Text>
            </Pressable>
          </View>

          {errorMsg ? (
            <View className="bg-danger-soft border border-danger/40 rounded-lg px-3 py-2">
              <Text className="text-danger text-sm" style={{ fontFamily: 'Inter_500Medium' }}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <Button onPress={onSubmit} loading={login.isPending} fullWidth className="mt-2">
            Sign in
          </Button>

          <View className="flex-row items-center my-3">
            <View className="flex-1 h-px bg-border dark:bg-border-dark" />
            <Text
              className="text-fg-subtle dark:text-fg-dark-subtle text-xs mx-3"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              or
            </Text>
            <View className="flex-1 h-px bg-border dark:bg-border-dark" />
          </View>

          <Button
            variant="secondary"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/(auth)/sso',
                params: {},
              } as never)
            }
            leftIcon={<Ionicons name="key-outline" size={16} color={colors.fg} />}
          >
            Sign in with SSO
          </Button>

          <View className="flex-row items-center justify-center mt-4 opacity-70">
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.fgMuted} />
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-xs ml-1"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Secure access with 2FA
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
