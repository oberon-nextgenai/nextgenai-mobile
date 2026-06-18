import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/SectionCard';
import { useAuthStore } from '@/store/auth';
import { useMeQuery } from '@/api/hooks/authHooks';
import {
  useSetupTwoFactor,
  useVerifyTwoFactor,
  useDisableTwoFactor,
  useRequestPasswordReset,
  useChangePassword,
} from '@/api/hooks/securityHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

interface SetupState {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export default function SecurityScreen() {
  const { colors } = useThemeMode();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const me = useMeQuery(Boolean(user));
  const enabled = Boolean((me.data ?? user)?.twoFactorEnabled);

  const setup = useSetupTwoFactor();
  const verify = useVerifyTwoFactor();
  const disable = useDisableTwoFactor();
  const passwordReset = useRequestPasswordReset();
  const changePassword = useChangePassword();

  const [pendingSetup, setPendingSetup] = useState<SetupState | null>(null);
  const [otp, setOtp] = useState('');
  const [disableOtp, setDisableOtp] = useState('');
  const [disableMode, setDisableMode] = useState(false);
  const [changeMode, setChangeMode] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const onEnable = async () => {
    try {
      const data = await setup.mutateAsync();
      setPendingSetup({
        qrCode: data.qrCode,
        secret: data.secret,
        backupCodes: data.backupCodes ?? [],
      });
      setOtp('');
    } catch (e) {
      Alert.alert('Setup failed', (e as Error).message);
    }
  };

  const onVerify = async () => {
    if (!pendingSetup) return;
    try {
      await verify.mutateAsync({
        code: otp.trim(),
        secret: pendingSetup.secret,
        backupCodes: pendingSetup.backupCodes,
      });
      setPendingSetup(null);
      setOtp('');
      await me.refetch();
      const next = me.data;
      if (next) await setUser(next);
    } catch {
      // toast handled
    }
  };

  const onDisable = async () => {
    try {
      await disable.mutateAsync(disableOtp.trim());
      setDisableMode(false);
      setDisableOtp('');
      await me.refetch();
      const next = me.data;
      if (next) await setUser(next);
    } catch {
      // toast handled
    }
  };

  const onChangePassword = async () => {
    if (newPw !== confirmPw) {
      Alert.alert('Passwords do not match');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: currentPw, newPassword: newPw });
      setChangeMode(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch {
      // toast handled in the hook
    }
  };

  const onPasswordReset = () => {
    const email = user?.email;
    if (!email) {
      Alert.alert('No email on file');
      return;
    }
    Alert.alert(
      'Send password reset email?',
      `We'll email a reset link to ${email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => passwordReset.mutate(email) },
      ],
    );
  };

  return (
    <Screen avoidKeyboard edges={{ top: true, bottom: false }}>
      <AppHeader title="Security" showBack showOrgPill={false} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SectionCard
          label="Two-factor auth"
          heading={enabled ? '2FA is enabled' : '2FA is off'}
          description={
            enabled
              ? 'A code is required every time you sign in.'
              : 'Add a one-time code to every sign-in for extra protection.'
          }
        >
          {pendingSetup ? (
            <View className="gap-3">
              <View className="items-center bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle rounded-xl p-4">
                <Image
                  source={{ uri: pendingSetup.qrCode }}
                  style={{ width: 180, height: 180 }}
                  resizeMode="contain"
                />
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-[11px] mt-3 text-center"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  Scan with Google Authenticator, 1Password, or Authy.
                </Text>
                <Pressable
                  onPress={() => void Clipboard.setStringAsync(pendingSetup.secret)}
                  className="mt-2 px-3 py-1.5 rounded-full bg-accent-soft dark:bg-accent-soft-dark"
                >
                  <Text
                    className="text-accent dark:text-accent-dark text-[11px]"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    Copy setup key
                  </Text>
                </Pressable>
              </View>
              <Input
                label="6-digit code"
                value={otp}
                onChangeText={setOtp}
                placeholder="123 456"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {pendingSetup.backupCodes.length > 0 ? (
                <View className="bg-warning-soft dark:bg-warning-soft rounded-xl p-3">
                  <Text
                    className="text-fg dark:text-fg-dark-DEFAULT text-[12px] mb-2"
                    style={{ fontFamily: 'Inter_600SemiBold' }}
                  >
                    Save your backup codes
                  </Text>
                  <View className="flex-row flex-wrap">
                    {pendingSetup.backupCodes.map((c) => (
                      <Text
                        key={c}
                        className="text-fg dark:text-fg-dark-DEFAULT text-[12px] w-1/2 py-0.5"
                        style={{ fontFamily: 'Menlo' }}
                      >
                        {c}
                      </Text>
                    ))}
                  </View>
                  <Pressable
                    onPress={() =>
                      void Clipboard.setStringAsync(pendingSetup.backupCodes.join('\n'))
                    }
                    className="mt-2"
                  >
                    <Text
                      className="text-accent dark:text-accent-dark text-[11px]"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      Copy all
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => {
                      setPendingSetup(null);
                      setOtp('');
                    }}
                  >
                    Cancel
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    variant="primary"
                    fullWidth
                    loading={verify.isPending}
                    disabled={otp.trim().length < 6}
                    onPress={onVerify}
                  >
                    Verify
                  </Button>
                </View>
              </View>
            </View>
          ) : enabled ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Enabled
                </Text>
                <Switch
                  value={true}
                  onValueChange={() => setDisableMode((v) => !v)}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {disableMode ? (
                <View className="gap-2.5">
                  <Input
                    label="Confirm with a 6-digit code"
                    value={disableOtp}
                    onChangeText={setDisableOtp}
                    placeholder="123 456"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        variant="secondary"
                        fullWidth
                        onPress={() => {
                          setDisableMode(false);
                          setDisableOtp('');
                        }}
                      >
                        Cancel
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Button
                        variant="outline-danger"
                        fullWidth
                        loading={disable.isPending}
                        disabled={disableOtp.trim().length < 6}
                        onPress={onDisable}
                      >
                        Disable
                      </Button>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <Button
              variant="primary"
              fullWidth
              loading={setup.isPending}
              leftIcon={<Ionicons name="shield-checkmark-outline" size={15} color="#FFFFFF" />}
              onPress={onEnable}
            >
              Enable 2FA
            </Button>
          )}
        </SectionCard>

        <SectionCard
          label="Password"
          heading="Password"
          description="Change your password, or email yourself a reset link."
        >
          {changeMode ? (
            <View className="gap-2.5">
              <Input
                label="Current password"
                value={currentPw}
                onChangeText={setCurrentPw}
                placeholder="Current password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
              <Input
                label="New password"
                value={newPw}
                onChangeText={setNewPw}
                placeholder="New password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
              <Input
                label="Confirm new password"
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Re-enter new password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-[11px]"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                8–128 characters with uppercase, lowercase, number, and special character.
                Changing it signs out your other devices.
              </Text>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => {
                      setChangeMode(false);
                      setCurrentPw('');
                      setNewPw('');
                      setConfirmPw('');
                    }}
                  >
                    Cancel
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    variant="primary"
                    fullWidth
                    loading={changePassword.isPending}
                    disabled={!currentPw || newPw.length < 8 || !confirmPw}
                    onPress={onChangePassword}
                  >
                    Save
                  </Button>
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-2.5">
              <Button
                variant="primary"
                fullWidth
                leftIcon={<Ionicons name="lock-closed-outline" size={15} color="#FFFFFF" />}
                onPress={() => setChangeMode(true)}
              >
                Change password
              </Button>
              <Button
                variant="secondary"
                fullWidth
                loading={passwordReset.isPending}
                leftIcon={<Ionicons name="mail-outline" size={15} color={colors.fg} />}
                onPress={onPasswordReset}
              >
                Send reset email
              </Button>
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}
