import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/ui/Button';
import { GradientButton } from '@/components/ui/GradientButton';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/brand/Logo';
import { useLoginMutation } from '@/api/hooks/authHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

const REMEMBER_KEY = 'oberon.rememberedEmail';

/**
 * The screen's one moment: the brand block settles into place — a fade and a 10px
 * rise, rather than the 25px default, so it reads as the mark arriving and not as
 * a card sliding in. The form itself never moves; a field that animates while you
 * are trying to tap it is a nuisance, not a flourish.
 *
 * Reanimated layout animations default to `ReduceMotion.System`, so this is
 * skipped outright when the OS setting is on and the block simply renders.
 *
 * Web takes the preset instead. `withInitialValues` generates a custom keyframe,
 * and a custom name is not in Reanimated's `Animations` registry — which is the
 * condition for scheduling the cleanup at
 * `layoutReanimation/web/componentUtils.js:149-155`. That cleanup calls
 * `setElementPosition` (`componentStyle.js:33-40`), which sets `position:
 * absolute` and `margin: 0` on the element after the animation ends. The brand
 * block then leaves normal flow, `mb-9` is discarded, and the form lays out from
 * the top of the centred container and paints straight over the title. Preset
 * names skip that path, so the cost of avoiding it is web using the stock 25px
 * rise while native keeps the 10px one.
 */
const BRAND_ENTRANCE =
  Platform.OS === 'web'
    ? FadeInDown.duration(420)
    : FadeInDown.duration(420).withInitialValues({
        opacity: 0,
        transform: [{ translateY: 10 }],
      });

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

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(REMEMBER_KEY);
      if (stored) {
        setValue('email', stored);
        setRememberMe(true);
      }
    })();
  }, [setValue]);

  const onSubmit = handleSubmit(async values => {
    if (rememberMe) await AsyncStorage.setItem(REMEMBER_KEY, values.email);
    else await AsyncStorage.removeItem(REMEMBER_KEY);
    login.mutate(values);
  });

  const errorMsg =
    (login.error as { response?: { data?: { message?: string } }; message?: string } | undefined)
      ?.response?.data?.message ?? (login.error as Error | undefined)?.message;

  return (
    <Screen background="nebula" avoidKeyboard className="px-6">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand block — the app states what it is before asking who you are. */}
        <Animated.View entering={BRAND_ENTRANCE} className="items-center mb-9">
          <Logo size={56} />
          <Text variant="mono.label" tone="accent" className="mt-4">
            NextGen AI · Prime
          </Text>
          <Text variant="display.lg" className="mt-2 text-center">
            AI Workforce Command
          </Text>
          <Text variant="body.sm" tone="muted" className="mt-2 text-center">
            Your executive console for the AI workforce.
          </Text>
        </Animated.View>

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
                leftIcon={<Ionicons name="lock-closed-outline" size={16} color={colors.fgMuted} />}
                rightIcon={
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={colors.fgMuted}
                  />
                }
                onPressRightIcon={() => setShowPassword(v => !v)}
              />
            )}
          />

          <View className="flex-row items-center justify-between mt-1">
            <Checkbox checked={rememberMe} onChange={setRememberMe} label="Remember me" />
            <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
              <Text variant="body.sm" tone="accent">
                Forgot password?
              </Text>
            </Pressable>
          </View>

          {errorMsg ? (
            <Card variant="plain" padding="sm" style={{ backgroundColor: colors.dangerSoft }}>
              <Text variant="body.sm" tone="danger">
                {errorMsg}
              </Text>
            </Card>
          ) : null}

          <GradientButton onPress={onSubmit} loading={login.isPending} fullWidth className="mt-2">
            Sign in
          </GradientButton>

          <View className="flex-row items-center my-3">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
            <Text variant="mono.label" tone="subtle" className="mx-3">
              or
            </Text>
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
          </View>

          <Button
            variant="secondary"
            fullWidth
            onPress={() => router.push({ pathname: '/(auth)/sso', params: {} } as never)}
            leftIcon={<Ionicons name="shield-outline" size={16} color={colors.fg} />}
          >
            Continue with Enterprise SSO
          </Button>

          {/* Only claims the app actually implements — 2FA and biometric unlock
              both exist. Compliance badges are not asserted here. */}
          <View className="items-center mt-6 gap-1.5">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed-outline" size={11} color={colors.fgSubtle} />
              <Text variant="mono.label" tone="subtle" className="ml-1.5">
                Two-factor authentication supported
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="finger-print-outline" size={11} color={colors.fgSubtle} />
              <Text variant="mono.label" tone="subtle" className="ml-1.5">
                Biometric unlock available after sign-in
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
