import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as securityService from '@/api/services/security';
import { useAuthStore } from '@/store/auth';

function err(e: unknown): string {
  return (
    (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
    (e as Error).message ??
    'Request failed'
  );
}

export function useSetupTwoFactor() {
  return useMutation({ mutationFn: () => securityService.setupTwoFactor() });
}

export function useVerifyTwoFactor() {
  return useMutation({
    mutationFn: (vars: { code: string; secret: string; backupCodes: string[] }) =>
      securityService.verifyTwoFactor(vars.code, vars.secret, vars.backupCodes),
    onSuccess: () => Toast.show({ type: 'success', text1: '2FA enabled' }),
    onError: (e) =>
      Toast.show({ type: 'error', text1: 'Verification failed', text2: err(e) }),
  });
}

export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: (code: string) => securityService.disableTwoFactor(code),
    onSuccess: () => Toast.show({ type: 'success', text1: '2FA disabled' }),
    onError: (e) =>
      Toast.show({ type: 'error', text1: 'Disable failed', text2: err(e) }),
  });
}

export function useChangePassword() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (vars: { currentPassword: string; newPassword: string }) =>
      securityService.changePassword(vars.currentPassword, vars.newPassword),
    onSuccess: async (data) => {
      // Backend rotated sessionVersion (other devices signed out) and returned a
      // fresh token for this device — persist it so we stay authenticated.
      const user = useAuthStore.getState().user;
      if (data.access_token && user) {
        await setSession(data.access_token, user);
      }
      Toast.show({
        type: 'success',
        text1: 'Password changed',
        text2: 'Your other devices were signed out.',
      });
    },
    onError: (e) =>
      Toast.show({ type: 'error', text1: 'Could not change password', text2: err(e) }),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => securityService.requestPasswordReset(email),
    onSuccess: () =>
      Toast.show({
        type: 'success',
        text1: 'Reset email sent',
        text2: 'Check your inbox for the link.',
      }),
    onError: (e) =>
      Toast.show({ type: 'error', text1: 'Could not send email', text2: err(e) }),
  });
}
