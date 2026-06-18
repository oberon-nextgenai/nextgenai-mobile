import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as authService from '@/api/services/auth';
import { getApiOrigin } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';
import { QUERY_KEYS } from '@/lib/constants';
import type { LoginRequest, TwoFactorLoginRequest } from '@/api/services/types';

WebBrowser.maybeCompleteAuthSession();

const MOBILE_SSO_REDIRECT = 'primeai://auth/sso';

/**
 * Native iOS Sign in with Apple. Generates a random nonce, hashes it (Apple
 * echoes the SHA-256 in the identity token's `nonce` claim), and posts the raw
 * nonce to the backend, which re-hashes it to verify. Returns the session.
 */
async function appleNativeSignIn() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token');
  }
  return authService.appleSignIn({
    identityToken: credential.identityToken,
    nonce: rawNonce,
    fullName: credential.fullName
      ? {
          givenName: credential.fullName.givenName ?? undefined,
          familyName: credential.fullName.familyName ?? undefined,
        }
      : undefined,
  });
}

export function useLoginMutation() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: async (result) => {
      if (result.requiresTwoFactor && result.tempToken) {
        router.replace({
          pathname: '/(auth)/two-factor',
          params: { tempToken: result.tempToken, email: result.user?.email ?? '' },
        });
        return;
      }
      if (result.access_token) {
        await setSession(result.access_token, result.user);
        router.replace('/');
      }
    },
  });
}

export function useTwoFactorLoginMutation() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: TwoFactorLoginRequest) => authService.twoFactorLogin(payload),
    onSuccess: async (result) => {
      if (result.access_token) {
        await setSession(result.access_token, result.user);
        router.replace('/');
      }
    },
  });
}

export function useMeQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: authService.fetchMe,
    enabled,
    staleTime: 60_000,
  });
}

export function usePermissionsQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: authService.fetchPermissions,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useOrganizationsQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.orgs,
    queryFn: authService.fetchOrganizations,
    enabled,
    staleTime: 60_000,
  });
}

export function useSSOLoginMutation() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (provider: 'google' | 'microsoft' | 'apple') => {
      if (provider === 'apple') {
        return appleNativeSignIn();
      }

      const startUrl =
        `${getApiOrigin()}${PATHS.auth.mobileSsoStart(provider)}` +
        `?redirect=${encodeURIComponent(MOBILE_SSO_REDIRECT)}`;

      const result = await WebBrowser.openAuthSessionAsync(
        startUrl,
        MOBILE_SSO_REDIRECT,
      );

      if (result.type !== 'success' || !result.url) {
        throw new Error(
          result.type === 'cancel'
            ? 'SSO cancelled'
            : 'SSO flow did not complete',
        );
      }

      const url = new URL(result.url);
      const params = url.searchParams;
      const ott = params.get('token');
      const errorParam = params.get('error');
      if (errorParam) {
        throw new Error(decodeURIComponent(errorParam));
      }
      if (!ott) {
        throw new Error('Missing SSO token in callback');
      }

      return authService.exchangeMobileSso(ott);
    },
    onSuccess: async (loginResult) => {
      if (loginResult.access_token) {
        await setSession(loginResult.access_token, loginResult.user);
        router.replace('/');
      }
    },
  });
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((s) => s.clear);
  const clearOrg = useOrgStore((s) => s.clear);
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: async () => {
      await Promise.all([clearAuth(), clearOrg()]);
      qc.clear();
      router.replace('/(auth)/sign-in');
    },
  });
}
