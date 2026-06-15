import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as securityService from '@/api/services/security';

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
